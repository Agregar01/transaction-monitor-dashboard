"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useEffect } from "react";

export default function RegulatorGuard({ children }: { children: React.ReactNode }) {
  const { isRegulator, isAdmin, isAuthenticated } = useAppSelector((s) => s.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isRegulator && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isRegulator, isAdmin, isAuthenticated, router]);

  // Allow regulators and platform admins
  if (!isAuthenticated || (!isRegulator && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
