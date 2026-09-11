export function NexaLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9EC4FF" />
          <stop offset="55%" stopColor="#5086F2" />
          <stop offset="100%" stopColor="#0439D9" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" stroke="#5086F2" strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="15" fill="url(#core)" opacity="0.95" />
      <path
        d="M16 31V17h3.4l7.1 10.4V17H30v14h-3.4L19.6 20.7V31H16Z"
        fill="white"
      />
    </svg>
  )
}

export function PlasmaBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-plasma-void">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(80,134,242,0.18),_transparent_42%),radial-gradient(circle_at_80%_80%,_rgba(4,57,217,0.28),_transparent_40%)]" />
      <div className="absolute -left-24 top-[-10%] h-[42rem] w-[42rem] rounded-full bg-primary/30 blur-3xl animate-plasma-drift" />
      <div className="absolute -right-10 bottom-[-20%] h-[36rem] w-[36rem] rounded-full bg-accent/25 blur-3xl animate-plasma-drift-slow" />
      <div className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-plasma-mist/10 blur-3xl animate-plasma-pulse" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(158,196,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(158,196,255,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  )
}
