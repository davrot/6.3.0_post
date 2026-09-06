import React from 'react'

/**
 * Material Symbols icon (the app's existing icon font — brand-consistent with
 * the rest of OlliTeX, and accepted by Mantine's icon slots as a plain node).
 */
export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-rounded"
      style={{ fontSize: size, lineHeight: 1, display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
