"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
};

export function useConfirmation() {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const ask = useCallback((nextOptions: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOptions(nextOptions);
  }), []);

  const settle = useCallback((confirmed: boolean) => {
    setOptions(null);
    resolver.current?.(confirmed);
    resolver.current = null;
  }, []);

  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!options) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") settle(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [options, settle]);

  const dialog = options ? (
    <div className="confirm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) settle(false); }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <h2 id="confirm-dialog-title">{options.title}</h2>
        <p id="confirm-dialog-message">{options.message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="button button-light" onClick={() => settle(false)}>Quay lại</button>
          <button ref={confirmRef} type="button" className={`button ${options.danger ? "button-danger" : "button-primary"}`} onClick={() => settle(true)}>{options.confirmLabel}</button>
        </div>
      </section>
    </div>
  ) : null;

  return { ask, dialog };
}
