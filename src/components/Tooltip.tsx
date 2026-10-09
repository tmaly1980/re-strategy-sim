"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  text: string;
}

export function Tooltip({ text }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center ml-1 align-middle">
      <button
        type="button"
        aria-label="More info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="text-slate-300 hover:text-slate-500 transition-colors leading-none focus:outline-none"
        style={{ fontSize: "11px" }}
      >
        ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-52 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 shadow-md leading-snug pointer-events-none"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-200" style={{ marginTop: "-1px" }} />
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" style={{ marginTop: "-2px" }} />
        </span>
      )}
    </span>
  );
}
