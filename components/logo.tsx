import logo from "@/lib/logo.json";

export default function Logo() {
  return <svg viewBox={`0 0 ${logo.width} ${logo.height}`} fill="currentColor" aria-hidden="true" focusable="false"><path d={logo.path} /></svg>;
}
