"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectMenuOption = { value: string; label: string };

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  disabled,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  const autoId = useId();
  const triggerId = `${autoId}-trigger`;
  const listId = `${autoId}-list`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? (value ? value : placeholder);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="grid gap-2">
      <label htmlFor={triggerId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          id={triggerId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#52A88E] focus:ring-2 focus:ring-[#52A88E]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected ? "font-medium" : "text-slate-500"}>{display}</span>
          <span
            className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {open ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-900/10 ring-1 ring-black/[0.04]"
          >
            {options.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-slate-500">No options</p>
            ) : (
              options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-[#52A88E]/12 font-semibold text-[#2d6b5a]"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
