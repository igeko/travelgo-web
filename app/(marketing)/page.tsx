import { AppHeaderServer } from "@/features/app/AppHeaderServer";

export default function MarketingHome() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeaderServer activeNav="trips" />

      {/* Hero */}
      <section className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-white px-6 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Under construction — early preview
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Plan trips you'll
            <span className="block bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent dark:from-sky-400 dark:to-indigo-400">
              remember forever.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            TravelGo brings itineraries, maps and travel notes together in one
            place. From ideas to boarding pass, without scattered tabs.
          </p>
          <div id="cta" className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="/trips"
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Join the waitlist
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-50 dark:hover:bg-white/5"
            >
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* Features placeholder */}
      <section
        id="features"
        className="border-t border-zinc-200/60 bg-zinc-50/50 px-6 py-20"
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
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {f.title}
              </h3>
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/60 px-6 py-8 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>© {new Date().getFullYear()} TravelGo</span>
          <span>Made with Next.js</span>
        </div>
      </footer>
    </main>
  );
}
