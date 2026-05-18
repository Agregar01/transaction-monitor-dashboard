"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useEffect } from "react";

export default function ClientGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isRegulator, isAuthenticated } = useAppSelector((s) => s.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      router.replace("/dashboard");
    } else if (isAuthenticated && isRegulator) {
      router.replace("/dashboard/regulator");
    }
  }, [isAdmin, isRegulator, isAuthenticated, router]);

  if (!isAuthenticated || isAdmin || isRegulator) {
    return null;
  }

  return <>{children}</>;
}
