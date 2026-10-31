"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

const options = [
  { label: "Графический дизайн", detail: "Афиши, постеры, презентации", value: "Графика и визуальные коммуникации" },
  { label: "Брендинг", detail: "Логотип, фирменный стиль, брендбук", value: "Брендинг" },
  { label: "Интерьеры и архитектура", detail: "Планировки, чертежи, пространства", value: "Интерьеры и архитектура" },
  { label: "Другая задача", detail: "Расскажите о ней в сообщении", value: "Другая задача" },
];

export default function DirectionSelect() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  const reduced = useReducedMotion();
  const labelId = `${id}-label`, valueId = `${id}-value`, listId = `${id}-list`;
  const typeahead = useRef({ text: "", time: 0 });

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function show(index = selected ?? 0) {
    const rect = trigger.current?.getBoundingClientRect();
    setSide(rect && window.innerHeight - rect.bottom < 280 && rect.top > 280 ? "top" : "bottom");
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    setSelected(index);
    setOpen(false);
    trigger.current?.focus();
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) show();
        else setActive(i => (i + 1) % options.length);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) show(selected ?? options.length - 1);
        else setActive(i => (i - 1 + options.length) % options.length);
        return;
      case "Home":
      case "End":
        event.preventDefault();
        if (!open) show(event.key === "Home" ? 0 : options.length - 1);
        else setActive(event.key === "Home" ? 0 : options.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else show();
        return;
      case "Escape":
        if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now();
          const text = (now - typeahead.current.time < 600 ? typeahead.current.text : "") + event.key.toLocaleLowerCase("ru");
          typeahead.current = { text, time: now };
          const index = options.findIndex(option => option.label.toLocaleLowerCase("ru").startsWith(text));
          if (index !== -1) { event.preventDefault(); if (open) setActive(index); else show(index); }
        }
    }
  }

  return <div className="direction-field" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label id={labelId} htmlFor={id}>Направление</label>
    <input type="hidden" name="direction" value={selected === null ? "" : options[selected].value} />
    <button ref={trigger} id={id} type="button" role="combobox" className="direction-trigger" aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-labelledby={`${labelId} ${valueId}`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={keyboard}>
      <span id={valueId} className={selected === null ? "direction-placeholder" : undefined}>{selected === null ? "Выберите направление" : options[selected].label}</span>
      <ChevronDown size={18} strokeWidth={1.5} className={open ? "is-open" : ""} />
    </button>
    <AnimatePresence>{open && <motion.ul id={listId} role="listbox" aria-labelledby={labelId} className="direction-options" data-side={side} data-lenis-prevent initial={reduced ? false : { opacity: 0, y: side === "bottom" ? -6 : 6, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: side === "bottom" ? -4 : 4 }} transition={{ duration: .18, ease: [.2, .8, .2, 1] }}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={selected === index} data-active={active === index} onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span><span className="direction-option-label">{option.label}</span><span className="direction-option-detail">{option.detail}</span></span>
        {selected === index && <Check size={17} strokeWidth={1.6} />}
      </li>)}
    </motion.ul>}</AnimatePresence>
  </div>;
}
