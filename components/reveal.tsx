"use client";
import { motion, useReducedMotion } from "motion/react";

export default function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -30px 0px" }} transition={{ duration: 1.05, delay, ease: [.19, 1, .22, 1] }}>{children}</motion.div>;
}
