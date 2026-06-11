"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setActivePersona } from "@/redux/slices/authSlice";
import {
  personasForRoles,
  effectivePersona,
  PERSONA_META,
  type Persona,
} from "@/lib/personas";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";

/**
 * Lets a multi-role user switch between the personas they're entitled to.
 * Hidden entirely for single-persona users (the common case). Switching changes
 * both the landing view and the nav profile; we send the user to /dashboard so
 * they land on the new persona's overview rather than a now-hidden route.
 */
export default function PersonaSwitcher() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { roles, activePersona } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = personasForRoles(roles);
  const current = effectivePersona(roles, activePersona);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Nothing to switch between — don't render the control at all.
  if (options.length <= 1) return null;

  const choose = (p: Persona) => {
    setOpen(false);
    if (p === current) return;
    dispatch(setActivePersona(p));
    // Land on the overview so the user isn't stranded on a route the new
    // persona's nav no longer shows.
    if (pathname !== "/dashboard") router.push("/dashboard");
  };

  return (
    <div ref={ref} className="relative px-3 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-lg bg-navy-600/60 hover:bg-navy-600 px-3 py-2 text-left transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-navy-400">Viewing as</span>
          <span className="block text-sm font-medium text-white truncate">
            {PERSONA_META[current].label}
          </span>
        </span>
        <ChevronUpDownIcon className="h-4 w-4 text-navy-300 shrink-0" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-3 right-3 z-50 mt-1 rounded-lg bg-navy-700 border border-navy-500 shadow-xl py-1 max-h-72 overflow-y-auto"
        >
          {options.map((p) => (
            <li key={p}>
              <button
                role="option"
                aria-selected={p === current}
                onClick={() => choose(p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-navy-100 hover:bg-navy-600 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block font-medium truncate">{PERSONA_META[p].label}</span>
                  <span className="block text-[11px] text-navy-400 truncate">{PERSONA_META[p].blurb}</span>
                </span>
                {p === current && <CheckIcon className="h-4 w-4 text-primary shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
