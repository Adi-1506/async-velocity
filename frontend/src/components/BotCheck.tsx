"use client";
import { useEffect, useRef } from "react";
type Turnstile = {
  render: (
    node: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
  reset: () => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let scriptPromise: Promise<void> | undefined;
export default function BotCheck() {
  const container = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!sitekey || !container.current) return;
    let disposed = false,
      id: string | undefined;
    if (!scriptPromise)
      scriptPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Security check failed to load"));
        document.head.appendChild(script);
      });
    void scriptPromise
      .then(() => {
        if (disposed || !container.current) return;
        id = window.turnstile?.render(container.current, {
          sitekey,
          callback: (token) => {
            if (input.current) input.current.value = token;
          },
          "expired-callback": () => {
            if (input.current) input.current.value = "";
          },
        });
      })
      .catch(() => {
        if (container.current)
          container.current.textContent =
            "Security check could not load. Refresh to try again.";
      });
    return () => {
      disposed = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [sitekey]);
  if (!sitekey) return null;
  return (
    <>
      <div ref={container} />
      <input ref={input} name="turnstileToken" type="hidden" />
    </>
  );
}
