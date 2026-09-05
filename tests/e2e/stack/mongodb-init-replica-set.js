/**
 * mongo docker-entrypoint-initdb.d hook (runs ONLY on a first, empty data
 * dir): initialize the single-node replica set `overleaf` — the shape the
 * Overleaf stack needs (production mongo: replSet=overleaf).
 *
 * The member host MUST be the compose service name (mongo:27017), not
  * 127.0.0.1: the hello `me` field is stored as given, and client
  * containers (overleaf) must be able to resolve it. The mongo container
  * itself keeps `extra_hosts: mongo:127.0.0.1` so it can reach itself.
  *
 * mongosh quirk: `rs.status()` THROWS `no replset config has been received`
 * when unconfigured (it does not return {ok:0}), so we initiate from the
 * error path. Idempotent for already-initialized sets.
 */
function waitPrimary(maxMs) {
  const end = Date.now() + maxMs
  while (Date.now() < end) {
    try {
      const s = rs.status()
      if (s.ok && s.myState === 1) return true
    } catch (e) {
      /* not a replset yet */
    }
    sleep(500)
  }
  return false
}

let initiated = false
try {
  const s = rs.status()
  if (!s.ok) {
    // returned a failure doc (not a throw)
    initiated = initiateIfNoReplSet(String(s.errmsg || s.err || ''))
  } else {
    print('replica set already configured')
  }
} catch (e) {
  initiated = initiateIfNoReplSet(String(e.message || e.errmsg || e))
}

function initiateIfNoReplSet(msg) {
  if (/no replset config|NoReplSet|not part of a replica set/i.test(msg)) {
    print('replica set unconfigured → initiating "overleaf"')
    rs.initiate({
      _id: 'overleaf',
      members: [{ _id: 0, host: 'mongo:27017' }],
    })
    return true
  }
  print('unexpected rs.status() failure: ' + msg)
  return false
}
if (initiated === undefined) initiated = false

if (!waitPrimary(120000)) {
  print('WARNING: replica set "overleaf" did not reach PRIMARY within 120s')
} else {
  print('replica set "overleaf" is PRIMARY')
}
