import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconApps(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </svg>
  )
}

export function IconDesktop(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.8" />
      <path d="M8 20h8M12 16.5V20" />
    </svg>
  )
}

export function IconQr(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3M20 14v3M14 20h6" />
    </svg>
  )
}

export function IconChart(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" />
    </svg>
  )
}

export function IconPalette(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M12 4a8 8 0 1 0 0 16h1.2a2.2 2.2 0 0 0 2.2-2.2 2 2 0 0 1 2-2H18a4 4 0 0 0 0-8h-.5" />
      <circle cx="8" cy="10" r=".8" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="13.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

export function IconPower(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M12 4v8M7.2 6.4a7 7 0 1 0 9.6 0" />
    </svg>
  )
}

export function IconWifi(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M5 10.5c4-3.6 10-3.6 14 0M8 13.8c2.4-2 5.6-2 8 0M12 18h.01" />
    </svg>
  )
}

export function IconBell(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M6.5 16V11a5.5 5.5 0 1 1 11 0v5l1.2 2H5.3L6.5 16zM10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconUser(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="8.5" r="3.2" />
      <path d="M5.5 19.2c1.4-3 3.8-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
    </svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  )
}

export function IconMax(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.2" />
    </svg>
  )
}

export function IconMin(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M6 16h12" />
    </svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
    </svg>
  )
}

export function IconNexa(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="var(--plasma-accent)" />
      <path d="M8 15.5V8.5L16 15.5V8.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
