import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <section className="gdl-screen-root flex min-h-dvh w-full flex-col items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-3xl text-center">
          <p className="font-gdl-display text-xs font-semibold uppercase tracking-[0.45em] text-[var(--gdl-teal-soft)]">
            Gameday Lockers
          </p>
          <h1 className="font-gdl-display mt-4 text-3xl font-bold uppercase tracking-[0.12em] text-[var(--gdl-chrome)] md:text-5xl">
            The future of the locker room
          </h1>
          <div
            className="mx-auto mt-8 h-1 w-28 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, var(--gdl-teal), transparent)",
            }}
          />
          <p className="mt-10 text-lg leading-relaxed text-[var(--gdl-muted)] md:text-xl">
            For years, physical nameplates have been a hassle for coaches and equipment staff — ordering,
            waiting, and hoping they are correct. Gameday Lockers streamlines locker room
            management, strengthens team communication, and gives every player a personalized experience.
            Update from anywhere. No USB drives. No waiting on shipments.
          </p>
          <div className="mt-12 flex flex-col flex-wrap justify-center gap-4 sm:flex-row">
            <Link
              href="/admin"
              className="font-gdl-display rounded-lg bg-[var(--gdl-teal)] px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-white hover:bg-[var(--gdl-teal-hover)] active:opacity-95"
            >
              Dashboard
            </Link>
            <Link
              href="/control"
              className="font-gdl-display rounded-lg border-2 border-[var(--gdl-teal)] bg-transparent px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-[var(--gdl-teal-soft)] hover:bg-[rgba(82,168,142,0.12)]"
            >
              Live control
            </Link>
            <Link
              href="/screen"
              className="font-gdl-display rounded-lg border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-[var(--gdl-text)] hover:border-[var(--gdl-teal)]"
            >
              TV / screen
            </Link>
            <Link
              href="/admin/displays"
              className="font-gdl-display rounded-lg border-2 border-[var(--gdl-border)] bg-transparent px-8 py-4 text-center text-sm font-bold uppercase tracking-widest text-[var(--gdl-chrome)] hover:bg-[var(--gdl-panel)]"
            >
              Register code
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-6 py-16 text-slate-800 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
            What it solves
          </h2>
          <p className="mt-4 text-slate-600 md:text-lg">
            Gameday Lockers addresses common locker room pain points:
          </p>
          <ul className="mt-8 space-y-4 text-slate-700 md:text-lg">
            <li>
              <span className="font-semibold text-[#3d7d6c]">Quick changes.</span> Update names when
              rosters change — no new plates or lead times.
            </li>
            <li>
              <span className="font-semibold text-[#3d7d6c]">Cost efficiency.</span> Cut repeat orders
              and extra vendors.
            </li>
            <li>
              <span className="font-semibold text-[#3d7d6c]">Accuracy.</span> You control the content, so
              typos and mismatches fade away.
            </li>
            <li>
              <span className="font-semibold text-[#3d7d6c]">Simplicity.</span> No graphic designer or
              specialty fabricator required for day-to-day updates.
            </li>
            <li>
              <span className="font-semibold text-[#3d7d6c]">Remote management.</span> Push updates from
              anywhere — no walking the room with a thumb drive.
            </li>
            <li>
              <span className="font-semibold text-[#3d7d6c]">Integrated communication.</span> Share
              messages right on the nameplate instead of sticky notes or extra screens.
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-gdl-display text-center text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
            Who it helps
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[#3d7d6c]">
                Players
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                From day one, athletes see their name, position, and stats celebrated. Real-time updates
                keep schedules, performance notes, and coach messages within reach at the locker.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[#3d7d6c]">
                Coaches
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Refresh player info, game plans, or motivation in minutes. Welcome recruits with tailored
                messaging on visit days — no waiting on nameplate shipments when rosters change.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[#3d7d6c]">
                Equipment
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Simplify locker assignments, fix spelling instantly, and stay ahead of changes with
                clearer workflows — less firefighting, more support for players and coaches.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-8 border-t border-slate-200 bg-white px-6 py-16 md:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
            FAQ
          </h2>
          <dl className="mt-10 space-y-8">
            <div>
              <dt className="font-gdl-display text-base font-bold uppercase tracking-wide text-slate-900">
                Do I still need physical nameplates?
              </dt>
              <dd className="mt-2 text-slate-600">
                Digital nameplates replace the cycle of ordering, shipping, and replacing plates for every
                roster move. Your staff updates content directly in the dashboard.
              </dd>
            </div>
            <div>
              <dt className="font-gdl-display text-base font-bold uppercase tracking-wide text-slate-900">
                Can I run different looks for recruits or rival weeks?
              </dt>
              <dd className="mt-2 text-slate-600">
                Yes. Build multiple locker scenes per team, organize groups, and switch or schedule what
                appears on each display from live control or your admin workflow.
              </dd>
            </div>
            <div>
              <dt className="font-gdl-display text-base font-bold uppercase tracking-wide text-slate-900">
                How do screens join the system?
              </dt>
              <dd className="mt-2 text-slate-600">
                Each display shows a pairing code. You register codes in the admin under Screens — similar
                to registering devices with a short code, without exposing codes in the database until you
                add them.
              </dd>
            </div>
            <div>
              <dt className="font-gdl-display text-base font-bold uppercase tracking-wide text-slate-900">
                Why does locker room design matter?
              </dt>
              <dd className="mt-2 text-slate-600">
                The locker room supports training, recruiting, performance, and recovery. The best
                projects start by listening to players and staff — then layering technology that actually
                reduces their workload.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-100 px-6 py-12 text-center text-slate-600">
        <p className="font-gdl-display text-sm font-bold uppercase tracking-wide text-slate-800">
          Ready to lead the charge?
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm">
          Learn more on this site or reach your Gameday Lockers representative to see how digital
          nameplates can improve your facility.
        </p>
        <p className="mt-6">
          <Link
            href="mailto:sales@example.com"
            className="text-sm font-semibold text-[#3d7d6c] underline hover:text-[#52A88E]"
          >
            Contact sales
          </Link>
          <span className="mx-2 text-slate-400">·</span>
          <Link href="/admin" className="text-sm font-semibold text-[#3d7d6c] underline hover:text-[#52A88E]">
            Open dashboard
          </Link>
        </p>
      </footer>
    </div>
  );
}
