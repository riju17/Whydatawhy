export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="relative isolate w-full max-w-2xl overflow-hidden rounded-3xl bg-card/80 px-8 py-14 shadow-card ring-1 ring-border backdrop-blur">
        <div className="pointer-events-none absolute -left-20 -top-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-24 h-56 w-56 rounded-full bg-secondary/60 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            A quiet space for us
          </p>
          <h1 className="text-3xl font-display leading-tight text-foreground sm:text-4xl">
            Our Mailbox — a private place for letters
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Nestled away from the noise, this little corner is where our words can linger and feel at home.
          </p>
          <div className="mt-3 inline-flex items-center gap-3 rounded-full bg-secondary/70 px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm ring-1 ring-border">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-hand text-lg leading-none text-foreground">
              Just us, just words, just love.
            </span>
          </div>
          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Enter Our Mailbox
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
