"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/redux/store";
import { useEffect } from "react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated } = useAppSelector((s) => s.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isAuthenticated, router]);

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
