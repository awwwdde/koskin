"use client";
import { MotionConfig } from "motion/react";
import SmoothScroll from "./smooth-scroll";
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user"><SmoothScroll />{children}</MotionConfig>;
}
