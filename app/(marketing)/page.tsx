import { AppHeaderServer } from "@/features/app/AppHeaderServer";

export default function MarketingHome() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeaderServer activeNav="trips" />

      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-white px-6 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Under construction — early preview
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
            Plan trips you'll
            <span className="block bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              remember forever.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-ink-soft">
            TravelGo brings itineraries, maps and travel notes together in one
            place. From ideas to boarding pass, without scattered tabs.
          </p>
          <div id="cta" className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="/trips"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-white transition hover:bg-ink-hover"
            >
              Join the waitlist
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border-strong px-6 text-sm font-medium text-ink transition hover:bg-surface-soft"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Features placeholder */}
      <section
        id="features"
        className="border-t border-border bg-surface-soft/50 px-6 py-20"
      >
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3">
          {[
            {
              title: "Smart itineraries",
              body: "Build day by day, reorder with a drag, share with a link.",
            },
            {
              title: "All in one place",
              body: "Flights, hotels, bookings and travel notes in a single view.",
            },
            {
              title: "Made for travel",
              body: "Works offline, syncs when you're back online. No more scattered tabs.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-ink">
                {f.title}
              </h3>
              <p className="text-sm leading-6 text-ink-soft">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-xs text-ink-faint">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>© {new Date().getFullYear()} TravelGo</span>
          <span>Made with Next.js</span>
        </div>
      </footer>
    </main>
  );
}
