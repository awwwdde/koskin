"use client";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@/lib/projects";
import type { SiteContent } from "@/lib/content";
import { ContentContext, useSiteContent } from "./content-provider";
import Header from "./header";
import Reveal from "./reveal";
import ContactForm from "./contact-form";
import Logo from "./logo";

const Sculpture = dynamic(() => import("./sculpture"), { ssr: false, loading: () => <div className="sculpture-loading"><span>Загрузка 3D</span></div> });

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 85]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -45]);
  return <section className="hero" ref={ref} aria-labelledby="hero-name">
    <div className="hero-stage">
      <motion.div className="hero-copy" initial={reduced ? false : { y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.1, ease: [.19, 1, .22, 1] }}>
        <h2>Графический дизайн<br />и пространства.</h2>
        <p className="hero-description">Брендинг, афиши, интерьеры<br />и архитектурное проектирование.</p>
        <a href="#work" className="hero-work-link"><span>Смотреть работы</span><ArrowDownRight size={23} /></a>
      </motion.div>
      <motion.div className="hero-portrait" style={{ y: imageY }} initial={reduced ? false : { clipPath: "inset(100% 0% 0% 0%)" }} animate={{ clipPath: "inset(0% 0% 0% 0%)" }} transition={{ duration: 1.3, ease: [.19, 1, .22, 1] }}>
        <Image src="/images/roman.png" alt="Роман Коськин" fill priority sizes="(max-width: 700px) 75vw, 43vw" className="portrait-image" />
      </motion.div>
      <a href="#contact" className="circle-contact"><span>Написать</span><ArrowUpRight size={25} /></a>
    </div>
    <motion.h1 id="hero-name" className="hero-name" style={{ y: titleY }} aria-label="Roman Koskin"><span>ROMAN</span><span>KOSKIN</span></motion.h1>
    <div className="hero-bottom"><a href="#work">Работы <ArrowDown size={14} /></a></div>
  </section>;
}

function ProjectCard({ project: p, eager }: { project: Project; eager: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return <article ref={ref} className={`project-card project-card-${p.slug}`}>
    <Link href={`/projects/${p.slug}`} className="project-image-link" aria-label={`Посмотреть направление ${p.name}`}>
      <div className="project-image"><motion.div className="project-image-plane" style={reduced ? {} : { y, scale: 1.18 }}><Image src={p.image} alt={`Иллюстрация направления: ${p.label}`} fill loading={eager ? "eager" : "lazy"} sizes="(max-width: 700px) 100vw, 90vw" /></motion.div><span className="project-open"><ArrowUpRight size={25} /></span></div>
    </Link>
    <div className="project-meta"><h3><Link href={`/projects/${p.slug}`}>{p.name}</Link></h3><span>{p.label}</span></div>
  </article>;
}

function Work() {
  const { projects } = useSiteContent();
  const [filter, setFilter] = useState("Все");
  const reduced = useReducedMotion();
  const results = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const filtered = projects.filter(p => filter === "Все" || p.category === filter);
  useLayoutEffect(() => {
    const element = results.current?.querySelector<HTMLElement>(`[data-project-filter="${filter}"]`);
    if (!element) return;
    let active = true;
    const measure = () => {
      // Exiting grids can detach after a rapid filter change. Never measure them.
      if (active && element.isConnected && element.offsetHeight > 0) setHeight(element.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [filter, projects]);
  return <section id="work" className="work-section section-pad" aria-labelledby="work-title">
    <Reveal className="work-heading"><h2 id="work-title">Работы.</h2><div className="project-filters" aria-label="Фильтр проектов">{["Все", "Графика", "Брендинг", "Пространство"].map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>)}</div></Reveal>
    <motion.div ref={results} className="project-results" initial={false} animate={{ height: height ?? "auto" }} transition={{ duration: reduced ? 0 : .42, ease: [.22, 1, .36, 1] }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={filter} data-project-filter={filter} className="project-grid" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, pointerEvents: "auto" }} exit={{ opacity: 0, y: reduced ? 0 : -8, pointerEvents: "none" }} transition={{ opacity: { duration: reduced ? 0 : .22 }, y: { duration: reduced ? 0 : .38, ease: [.22, 1, .36, 1] } }}>
          {filtered.map((p, i) => <ProjectCard key={p.slug} project={p} eager={i === 0 || projects.find(item => item.category === p.category)?.slug === p.slug} />)}
          {filtered.length === 0 && <p className="project-empty">В этом направлении пока нет опубликованных работ.</p>}
        </motion.div>
      </AnimatePresence>
    </motion.div>
    <span className="sr-only" role="status">{filter}: {filtered.length} работ</span>
    <p className="work-disclosure">Обложки иллюстрируют направления. Авторские работы — по запросу.</p>
  </section>;
}

function ReadingWord({ word, progress, start, end, reduced }: { word: string; progress: MotionValue<number>; start: number; end: number; reduced: boolean }) {
  const opacity = useTransform(progress, [start, end], [.22, 1]);
  return <motion.span style={reduced ? {} : { opacity }}>{word} </motion.span>;
}

function About() {
  const { settings } = useSiteContent();
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = settings.about.split(" ");
  return <section id="about" className="about-section section-pad" aria-labelledby="about-title">
    <h2 id="about-title" className="sr-only">Обо мне</h2>
    <div className="about-layout"><div className="about-aside"><div className="about-photo"><Image src="/images/roman.png" alt="Портрет Романа" width={360} height={480} sizes="(max-width: 700px) 45vw, 25vw" /></div></div>
      <div className="about-text"><p ref={ref} className="reading-text">{words.map((word, i) => <ReadingWord key={i} word={word} progress={scrollYProgress} start={i / words.length * .8} end={(i + 1) / words.length * .8} reduced={!!reduced} />)}</p><Reveal className="about-body"><p>{settings.biography}</p><p>{settings.extra}</p><a href="#contact" className="text-link">Связаться со мной <ArrowUpRight size={20} /></a></Reveal></div></div>
  </section>;
}

function Playground() {
  const ref = useRef<HTMLElement>(null);
  const [prepared, setPrepared] = useState(false);
  const [active, setActive] = useState(false);
  const [model, setModel] = useState<"column" | "arch" | "rotunda">("column");
  const [material, setMaterial] = useState<"stone" | "metal" | "wire">("stone");
  const [playing, setPlaying] = useState(true);
  const [explode, setExplode] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    const preload = () => { void import("./sculpture"); };
    const supportsIdle = typeof window.requestIdleCallback === "function";
    const idle = supportsIdle
      ? window.requestIdleCallback(preload, { timeout: 1800 })
      : window.setTimeout(preload, 1000);
    const prepare = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { preload(); setPrepared(true); prepare.disconnect(); }
    }, { rootMargin: "2200px 0px" });
    const visible = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    prepare.observe(ref.current);
    visible.observe(ref.current);
    return () => {
      prepare.disconnect(); visible.disconnect();
      if (supportsIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
  return <section ref={ref} id="playground" className="playground-section section-pad" aria-labelledby="playground-title">
    
    <div className="playground-layout"><div className="playground-copy"><Reveal><h2 id="playground-title">Архитектура<br />в объёме.</h2></Reveal><div className="model-selector" aria-label="Выбор архитектурной модели">{([["column", "Колонна"], ["arch", "Арка"], ["rotunda", "Ротонда"]] as const).map(([v, label]) => <button key={v} onClick={() => setModel(v)} aria-pressed={model === v}>{label}<ArrowUpRight size={17} /></button>)}</div></div>
      <div className="sculpture-view"><div className="scene-caption"><span>{model === "column" ? "Колонна" : model === "arch" ? "Арка" : "Ротонда"}</span></div><div className="scene-canvas">{prepared && <Sculpture model={model} material={material} playing={playing && !reduced && active} explode={explode} />}</div><div className="scene-controls"><div className="material-controls" aria-label="Материал">{([["stone", "Камень"], ["metal", "Металл"], ["wire", "Каркас"]] as const).map(([v, label]) => <button key={v} className={`material-${v}`} aria-label={label} title={label} aria-pressed={material === v} onClick={() => setMaterial(v)}><span /></button>)}</div><span className="scene-hint">Перетащите для вращения</span><button className="scene-pause" aria-label={playing ? "Остановить вращение" : "Включить вращение"} aria-pressed={!playing} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={17} /> : <Play size={17} />}</button></div><label className="explode-control"><span>Целое</span><input aria-label="Разобрать архитектурную модель" type="range" min="0" max="1" step="0.01" value={explode} onChange={e => setExplode(Number(e.target.value))} /><span>Детали</span></label></div>
    </div>
  </section>;
}

function Services() {
  const [expanded, setExpanded] = useState<number | null>(0);
  const { settings: { services } } = useSiteContent();
  return <section className="services-section section-pad" aria-labelledby="services-title"><Reveal><div className="section-heading"><h2 id="services-title">Услуги.</h2></div></Reveal><div className="services-list">{services.map((s, i) => <div className="service-item" key={s.name}><h3><button aria-expanded={expanded === i} aria-controls={`service-${i}`} onClick={() => setExpanded(expanded === i ? null : i)}><span>{s.name}</span><span className={`service-icon ${expanded === i ? "expanded" : ""}`}>+</span></button></h3><AnimatePresence initial={false}>{expanded === i && <motion.div id={`service-${i}`} className="service-details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .35 }}><div><p>{s.text}</p></div></motion.div>}</AnimatePresence></div>)}</div></section>;
}

function Contact() {
  const { settings } = useSiteContent();
  return <footer id="contact" className="contact-section section-pad"><Reveal><h2 className="contact-title">Обсудим<br />ваш проект?</h2></Reveal><div className="contact-layout"><div className="contact-intro"><p>Напишите мне в Telegram,<br />на почту или через форму.</p><a className="contact-email" href={`mailto:${settings.email}`}>{settings.email} <ArrowUpRight size={23} /></a><div className="contact-links"><a href={settings.telegram} target="_blank" rel="noopener noreferrer">Telegram <ArrowUpRight size={15} /></a><a href={`tel:${settings.phone.replace(/[^+0-9]/g, "")}`}>{settings.phone} <ArrowUpRight size={15} /></a></div></div><ContactForm /></div><div className="footer-bottom"><a href="#main" className="wordmark" aria-label="Роман Коськин — наверх"><Logo /></a><span>© {new Date().getFullYear()} Roman Koskin</span><Link href="/privacy">Обработка данных</Link><a href="#main">Наверх <ArrowUpRight size={14} /></a></div></footer>;
}

export default function Portfolio({ content }: { content: SiteContent }) {
  return <ContentContext.Provider value={content}><Header /><main id="main"><Hero /><Work /><About /><Playground /><Services /></main><Contact /></ContentContext.Provider>;
}
