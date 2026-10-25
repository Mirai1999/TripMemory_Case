import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./help-tip.css";

export function HelpTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const touchStarted = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { setOpen(false); touchStarted.current = false; }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <span className="product-help" ref={root} onPointerEnter={(event) => { if (event.pointerType !== "touch") setOpen(true); }} onPointerLeave={(event) => { if (event.pointerType !== "touch") setOpen(false); }} onFocus={() => { if (!touchStarted.current) setOpen(true); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.stopPropagation(); } }}>
      <button aria-describedby={open ? id : undefined} aria-label={label} className="product-help__trigger" onPointerDown={(event) => { touchStarted.current = event.pointerType === "touch"; }} onClick={() => { if (touchStarted.current) { setOpen((current) => !current); touchStarted.current = false; } }} type="button">？</button>
      {open && <span className="product-help__content" id={id} role="tooltip">{children}</span>}
    </span>
  );
}
