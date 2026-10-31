"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import Lenis from "lenis";

export default function SmoothScroll() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || pathname.startsWith("/admin")) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: .085,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: 24, force: true },
      prevent: node => node.closest("[data-lenis-prevent]") !== null,
    });
    const syncLock = () => {
      if (document.body.style.overflow === "hidden") lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    syncLock();
    return () => { observer.disconnect(); lenis.destroy(); };
  }, [pathname, reduced]);

  return null;
}
