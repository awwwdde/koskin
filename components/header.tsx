"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Logo from "./logo";

export default function Header({ inner = false }: { inner?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const root = inner ? "/" : "";
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      if (event.key === "Tab") {
        const links = menu.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links?.length) return;
        const first = links[0], last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); trigger.current?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); trigger.current?.focus(); }
        else if (event.shiftKey && document.activeElement === trigger.current) { event.preventDefault(); last.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", handle); };
  }, [open]);
  return <>
    <header className={`site-header${inner ? " inner-header" : ""}`}>
      <Link href="/" className="wordmark" aria-label="Роман Коськин — на главную"><Logo /></Link>
      <nav className="desktop-nav" aria-label="Основная навигация"><Link href={`${root}#work`}>Работы</Link><Link href={`${root}#about`}>Обо мне</Link><Link href={`${root}#playground`}>3D</Link></nav>
      <Link className="header-contact" href={`${root}#contact`}>Обсудить проект <ArrowUpRight size={15} /></Link>
      <button ref={trigger} className="menu-button" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </header>
    <AnimatePresence>{open && <motion.nav ref={menu} id="mobile-menu" className="mobile-menu" aria-label="Мобильная навигация" initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
      {[["Проекты", "work"], ["Об авторе", "about"], ["3D", "playground"], ["Контакты", "contact"]].map(([label, id], i) => <Link key={id} href={`${root}#${id}`} onClick={() => setOpen(false)}><small>0{i + 1}</small>{label}<ArrowUpRight /></Link>)}
      <p>Роман Коськин · Графический дизайнер</p>
    </motion.nav>}</AnimatePresence>
  </>;
}
