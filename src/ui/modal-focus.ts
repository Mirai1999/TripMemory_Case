import { useEffect, useRef, type RefObject } from "react";

export const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function inertOutside(root: HTMLElement): () => void {
  const overlay = root.closest<HTMLElement>(".modal-backdrop, .sp-dialog-backdrop, .login-legal-backdrop, .confirm-backdrop, .product-dialog-backdrop, [data-modal-overlay]");
  const host = overlay?.parentElement ?? root.parentElement;
  if (!host) return () => undefined;

  const siblings = Array.from(host.children).filter((child) => child !== overlay && child !== root) as HTMLElement[];
  const previous = siblings.map((element) => ({ element, inert: element.hasAttribute("inert") }));
  siblings.forEach((element) => element.setAttribute("inert", ""));
  return () => previous.forEach(({ element, inert }) => {
    if (!inert) element.removeAttribute("inert");
  });
}

function trapTab(event: KeyboardEvent, root: HTMLElement) {
  if (event.key !== "Tab") return;
  const items = focusable(root);
  if (!items.length) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function useModalFocus<T extends HTMLElement>(onEscape?: () => void, returnFocusRef?: RefObject<HTMLElement | null>): RefObject<T | null> {
  const rootRef = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const launcher = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const releaseOutside = inertOutside(root);
    const initial = root.querySelector<HTMLElement>("[data-autofocus]") ?? focusable(root)[0] ?? root;
    const addedTabIndex = initial === root && !root.hasAttribute("tabindex");
    if (addedTabIndex) root.setAttribute("tabindex", "-1");
    initial.focus();
    // A delayed focus repair must not undo a user's Tab navigation inside the dialog.
    const frame = window.requestAnimationFrame(() => {
      if (root.isConnected && !root.contains(document.activeElement)) initial.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Escape" && escapeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }
      trapTab(event, root);
    };
    root.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener("keydown", onKeyDown);
      releaseOutside();
      if (addedTabIndex) root.removeAttribute("tabindex");
      window.setTimeout(() => launcher?.focus(), 0);
    };
  }, []);

  return rootRef;
}
