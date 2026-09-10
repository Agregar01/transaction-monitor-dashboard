"use client";

import TransactionSimulator from "@/components/simulator/TransactionSimulator";

/**
 * Standalone, unauthenticated demo surface, deliberately isolated from the
 * main dashboard: no Sidebar/TopBar, no login, no <Link> anywhere on this
 * page or inside TransactionSimulator, so there is nothing here for a visitor
 * to navigate into the real app with.
 *
 * It's also isolated at the network level, not just the UI level: this page
 * never authenticates the browser itself (no cookies, no Redux auth state).
 * Every "Run simulation" call goes to /api/public-simulator, a server route
 * that holds its own service credential and forwards the request, so even a
 * technical visitor poking at the network tab has no session to reuse against
 * anything else in the app.
 */
export default function PublicSimulatorPage() {
  // Force dark on this isolated public surface: it has no theme toggle and a
  // public visitor carries no `localStorage.theme`, so the layout's theme script
  // would otherwise default it to light. `dark` on this wrapper makes every
  // `dark:` class below resolve (darkMode: "class" matches a .dark ancestor).
  return (
    <div className="dark">
      <div className="min-h-screen bg-[#08081C] text-[#F2F3FA]">
        <header className="border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-extrabold text-white">
                A
              </span>
              <span className="text-[13px] font-semibold tracking-tight">Autheo</span>
              <span className="text-[13px] text-[#666C99]">Decision sandbox</span>
            </div>
            <span className="hidden items-center gap-2 text-[11px] text-[#767CAB] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live engine, nothing is saved
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 sm:pt-14">
          <h1 className="max-w-[19ch] text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[38px]">
            Score a payment against the live engine.
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[#9FA3C4]">
            Make up a sender, shape a payment, and run it. It goes through the same rules,
            the same three risk layers and the same thresholds that decide real transactions.
            The run is rolled back, so no case opens and no record is written.
          </p>

          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#767CAB]">
            <li>
              <span className="font-mono tabular-nums text-[#C9CCE8]">111</span> detection rules
            </li>
            <li className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden />
            <li>Three risk layers plus an ML ensemble</li>
            <li className="hidden h-3 w-px bg-white/10 sm:block" aria-hidden />
            <li>
              <span className="font-mono tabular-nums text-[#C9CCE8]">5</span> decision bands over{" "}
              <span className="font-mono tabular-nums text-[#C9CCE8]">0-300</span>
            </li>
          </ul>

          <div className="mt-10">
            <TransactionSimulator canUse publicMode />
          </div>
        </main>
      </div>
    </div>
  );
}
