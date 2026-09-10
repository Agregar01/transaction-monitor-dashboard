import type { Metadata } from "next";

/**
 * The root layout titles every page "Transaction Monitor", which is the repo's
 * name rather than the product's. This surface is public and gets shared as a
 * link, so its tab and any unfurled preview need to say Validar.
 *
 * A layout is the only place to set this: the page itself is a client
 * component, and Next does not read `metadata` from those.
 */
export const metadata: Metadata = {
  title: "Validar Simulator",
  description:
    "Score a transaction against the live Validar decision engine. Nothing is saved.",
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
