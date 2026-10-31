"use client";
import { useState } from "react";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import DirectionSelect from "./direction-select";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), message: data.get("message"), direction: data.get("direction") || "", website: data.get("website"), consent: data.get("consent") === "on" }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) {
        if (response.status === 429) throw new Error("Слишком много обращений. Попробуйте немного позже или напишите в Telegram.");
        throw new Error("Не удалось отправить сообщение. Попробуйте ещё раз или напишите в Telegram.");
      }
      setStatus("success"); form.reset();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось отправить сообщение."); setStatus("error"); }
  }
  if (status === "success") return <div className="form-success" role="status"><span><Check size={28} /></span><h3>Сообщение отправлено.</h3><p>Спасибо за обращение.</p><button className="text-link" onClick={() => setStatus("idle")}>Отправить ещё одно <ArrowUpRight size={17} /></button></div>;
  return <form className="contact-form" onSubmit={submit}>
    <div className="form-row"><label>Как вас зовут<input name="name" placeholder="Ваше имя" autoComplete="name" required minLength={2} maxLength={100} /></label><label>Почта для ответа<input name="email" type="email" placeholder="hello@example.com" autoComplete="email" required maxLength={254} /></label></div>
    <DirectionSelect />
    <label>Сообщение<textarea name="message" placeholder="Задача, сроки, бюджет" required minLength={10} maxLength={5000} rows={3} /></label>
    <div className="honeypot" aria-hidden="true"><label>Оставьте это поле пустым<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="consent"><input type="checkbox" name="consent" required /><span>Разрешаю использовать имя, почту и сообщение для ответа на обращение. <a href="/privacy">Обработка данных</a></span></label>
    <div role="status" aria-live="polite">{status === "error" && <p className="form-error">{error}</p>}</div>
    <button className="submit-button" disabled={status === "sending"} type="submit">{status === "sending" ? "Отправляем" : "Отправить сообщение"}{status === "sending" ? <LoaderCircle className="spin" size={22} /> : <ArrowUpRight size={24} />}</button>
  </form>;
}
