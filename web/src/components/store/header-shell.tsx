"use client";

import { type ReactNode, useEffect, useState } from "react";

/** Cabecera fija que gana sombra al desplazarse, para separarla del contenido sin ocupar más espacio. */
export function HeaderShell({ children }: { readonly children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-30 border-b border-line bg-white transition-shadow ${scrolled ? "shadow-header" : ""}`}
    >
      {children}
    </header>
  );
}
