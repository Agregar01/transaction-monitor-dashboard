"use client";

import { useAppSelector } from "@/redux/store";
import TransactionSimulator from "@/components/simulator/TransactionSimulator";

export default function TransactionSimulatorPage() {
  const { permissions } = useAppSelector((s) => s.auth);
  return <TransactionSimulator canUse={permissions.includes("simulate_transaction")} />;
}
