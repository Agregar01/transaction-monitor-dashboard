"use client";

import Image from "next/image";
import TransactionSimulator from "@/components/simulator/TransactionSimulator";

/**
 * Standalone, unauthenticated demo surface for Validar, deliberately isolated
 * from the main dashboard: no Sidebar/TopBar, no login, no <Link> anywhere on
 * this page or inside TransactionSimulator, so there is nothing here for a
 * visitor to navigate into the real app with.
 *
 * It's also isolated at the network level, not just the UI level: this page
 * never authenticates the browser itself (no cookies, no Redux auth state).
 * Every "Run simulation" call goes to /api/public-simulator*, server routes
 * that hold their own service credential and forward the request, so even a
 * technical visitor poking at the network tab has no session to reuse against
 * anything else in the app.
 *
 * Who this page represents matters to how it behaves. The visitor stands in for
 * the BANK'S CUSTOMER / payment channel: they originate activity, that activity
 * is monitored, and whatever trips monitoring is written into a fixed demo
 * institution so the bank's own people can see it arrive in the Validar console.
 * What the visitor cannot do is the bank's compliance job — investigating and
 * filing an STR with the FIC. That is why TransactionSimulator runs here with
 * `publicMode`, which stops the guided walkthrough at escalation.
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
            <div className="flex items-center gap-3">
              {/* The wordmark is already the brand orange, so it sits on the
                  dark ground unaltered. Width is fixed and height derived to
                  keep the 4.8:1 wordmark from being squashed. */}
              <Image
                src="/agregar-logo.png"
                alt="Agregar"
                width={600}
                height={124}
                priority
                className="h-[18px] w-auto"
              />
              <span className="h-4 w-px bg-white/15" aria-hidden />
              <span className="text-[15px] font-semibold tracking-tight">Validar</span>
            </div>
            <span className="hidden items-center gap-2 text-[11px] text-[#767CAB] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live engine · flagged activity reaches the demo bank&apos;s console
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-24 pt-9 sm:pt-12">
          <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[36px]">
            Score a transaction
          </h1>

          <div className="mt-8">
            <TransactionSimulator canUse publicMode />
          </div>
        </main>
      </div>
    </div>
  );
}
