"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    // Don't show if already installed / running standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Don't show again if dismissed recently
    const dismissed = localStorage.getItem("installPromptDismissed");
    if (dismissed) return;

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    if (isIOS) {
      setPlatform("ios");
      setShow(true);
      return;
    }

    function handler(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("installPromptDismissed", "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4">
      <div className="flex-1 text-sm">
        {platform === "ios" ? (
          <p>
            Add CharmChase to your home screen: tap{" "}
            <span aria-label="share icon">⬆️</span> then "Add to Home
            Screen".
          </p>
        ) : (
          <p>Install CharmChase for quicker access, right from your home screen.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {platform === "android" && (
          <button
            onClick={install}
            className="rounded-md bg-ink px-3 py-1.5 text-xs text-white"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-muted"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
