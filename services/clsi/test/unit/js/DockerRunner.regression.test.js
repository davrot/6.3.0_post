/**
 * Regression: clsi compile DockerRunner entry gates (owner queue item
 * "compile DockerRunner").
 *
 * Pins the pre-docker logic of DockerRunner.run():
 *  - `allowedImages` allow-list: a disallowed image fails FAST with
 *    `image not allowed` and NO dockerode call is made (no container, no
 *    network, no disk);
 *  - `$COMPILE_DIR` command placeholder is rewritten to `/compile` in the
 *    container options that would be passed to docker;
 *  - `texliveImageNameOveride` re-tags the image registry while keeping the
 *    image name;
 *  - allowed image passes the gate and reaches createContainer with the
 *    substituted Cmd + overridden Image (docker lifecycle then short-circuits
 *    via a fake attach error — only the captured options are asserted).
 *
 * The dockerode instance is a fake that captures createContainer(options);
 * no real docker daemon / socket is touched.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const dockerodeMock = vi.hoisted(() => ({
  captured: [],
}))

vi.mock('dockerode', () => {
  const fakeContainer = {
    // force the "create new container" path in _startContainer
    inspect(cb) {
      cb(Object.assign(new Error('No such container'), { statusCode: 404 }))
    },
    // stop the lifecycle here (no start/attach dance) — error propagates out
    // of run(); only the captured createContainer options matter.
    attach(opts, cb) {
      cb(new Error('stop-here-test'))
    },
    start(cb) {
      cb(new Error('stop-here-test'))
    },
    modem: { demuxStream() {} },
  }
  class Docker {
    getContainer() {
      return fakeContainer
    }
    createContainer(options, cb) {
      dockerodeMock.captured.push(options)
      cb(null, fakeContainer)
    }
  }
  return { default: Docker }
})

vi.mock('@overleaf/settings', () => ({
  default: {
    clsi: {
      docker: {
        image: 'texlive/texlive',
        allowedImages: ['texlive/texlive'],
        env: {},
        user: 'root',
      },
    },
    path: { sandboxedCompilesHostDirCompiles: '/data/compiles' },
    texliveImageNameOveride: undefined,
  },
}))

vi.mock('../../../app/js/DockerLockManager.js', () => ({
  default: {
    // real contract: runner(releaseCb) where releaseCb(err, ...args) funnels
    // through callback(err, ...args)
    runWithLock(name, run, callback) {
      callback = callback || function () {}
      run((error1, ...args) => {
        if (error1 != null) return callback(error1)
        callback(null, ...args)
      })
    },
  },
}))

vi.mock('../../../app/js/LastProjectAccess.js', () => ({
  LAST_ACCESS: new Map(),
  getLastProjectAccessTime: () => 0,
}))

const { default: DockerRunner } = await import('../../../app/js/DockerRunner.mjs')

function runOnce(args) {
  return new Promise(resolve => {
    DockerRunner.run(...args, (error, output) => resolve({ error, output }))
  })
}

const DIR = '/tmp/dn-test'
const VOL = { [DIR]: '/compile' }
const ENV = { FOO: 'bar' }

describe('DockerRunner.run (regression)', () => {
  beforeEach(() => {
    dockerodeMock.captured.length = 0
  })

  it('rejects a non-allow-listed image before any docker call', async () => {
    const { error } = await runOnce([
      'proj-1',
      ['echo', 'hi', '$COMPILE_DIR/main.tex'],
      DIR,
      'evil/image:1.0',
      15000,
      ENV,
      'default',
      null,
    ])
    expect(error).toBeDefined()
    expect(error.message).toEqual('image not allowed')
    expect(dockerodeMock.captured.length).toEqual(0)
  })

  it('rewrites $COMPILE_DIR to /compile in the docker options', async () => {
    const { error } = await runOnce([
      'proj-2',
      ['pdflatex', '$COMPILE_DIR/main.tex', '-output-directory', '$COMPILE_DIR'],
      DIR,
      'texlive/texlive',
      15000,
      ENV,
      'default',
      null,
    ])

    // lifecycle stops at fake attach; options were captured on create
    const options = dockerodeMock.captured.at(-1)
    expect(options).toBeDefined()
    options.Cmd.forEach(arg => expect(arg).not.toMatch(/COMPILE_DIR/))
    expect(options.Cmd).toContain('/compile/main.tex')
    expect(options.Cmd).toContain('-output-directory')
    expect(options.Cmd).toContain('/compile')
    expect(options.WorkingDir).toEqual('/compile')
    expect(options.NetworkDisabled).toBe(true)
    // the stop-here error is expected (fake attach) — proves the path ran
    expect(error).toBeDefined()
    expect(error.message).toEqual('stop-here-test')
  })

  it('honours texliveImageNameOveride (registry re-tag, name kept)', async () => {
    const Settings = (await import('@overleaf/settings')).default
    Settings.texliveImageNameOveride = 'myregistry.local'

    await runOnce([
      'proj-3',
      ['pdflatex', 'main.tex'],
      DIR,
      'texlive/texlive',
      15000,
      ENV,
      'default',
      null,
    ])

    const options = dockerodeMock.captured.at(-1)
    expect(options.Image).toEqual('myregistry.local/texlive')

    Settings.texliveImageNameOveride = undefined
  })

  it('passes compile-group env through into the container Env', async () => {
    await runOnce([
      'proj-4',
      ['pdflatex', 'main.tex'],
      DIR,
      'texlive/texlive',
      15000,
      { MY_FLAG: '1' },
      'default',
      null,
    ])
    const options = dockerodeMock.captured.at(-1)
    expect(options.Env).toContain('MY_FLAG=1')
    expect(options.HostConfig.CapDrop).toEqual(['ALL'])
    expect(options.HostConfig.SecurityOpt).toContain('no-new-privileges')
  })
})
