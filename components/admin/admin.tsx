"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronLeft, ChevronRight, Circle, ExternalLink, FileText, Inbox, LayoutGrid, LoaderCircle, LogOut, Plus, Save, Search, Settings2, Upload, X } from "lucide-react";
import Logo from "../logo";
import type { ManagedProject, SiteContent } from "@/lib/content";

type Tab = "overview" | "enquiries" | "projects" | "settings";
type Status = "new" | "active" | "closed";
type Enquiry = { id: string; name: string; email: string; direction: string; message: string; status: Status; created_at: string };
type InboxData = { items: Enquiry[]; counts: Partial<Record<Status, number>>; total: number };
type Document = { revision: number; data: SiteContent };
const statuses = { new: "Новая", active: "В работе", closed: "Закрыта" };
const tabs = [
  { id: "overview", label: "Обзор", icon: LayoutGrid }, { id: "enquiries", label: "Заявки", icon: Inbox },
  { id: "projects", label: "Портфолио", icon: FileText }, { id: "settings", label: "Контент сайта", icon: Settings2 },
] as const;
const date = (value: string) => new Intl.DateTimeFormat("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value + "Z"));

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="adm-field"><span>{label}</span>{children}</label>; }
function Mark() { return <div className="adm-object" aria-hidden="true"><div className="adm-orbit" /><div className="adm-tile adm-tile-back" /><div className="adm-tile adm-tile-mid" /><div className="adm-tile adm-tile-front"><Logo /></div><div className="adm-object-shadow" /></div>; }

export default function Admin() {
  const [username, setUsername] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [document, setDocument] = useState<Document | null>(null);
  const latestDocument = useRef(document);
  useEffect(() => { latestDocument.current = document; }, [document]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [loginError, setLoginError] = useState("");
  const [inbox, setInbox] = useState<InboxData>({ items: [], counts: {}, total: 0 });
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [projectIndex, setProjectIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const dialogOpen = selected !== null || projectIndex !== null;

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api/admin${path}`, { signal: AbortSignal.timeout(15000), ...init, credentials: "same-origin", cache: "no-store", headers: { "X-Admin-Request": "1", ...init?.headers } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && path !== "/login") setUsername(null);
      throw new Error(typeof result.detail === "string" ? result.detail : response.status === 422 ? "Проверьте обязательные поля, адрес проекта и формат контактов." : "Не удалось выполнить запрос. Повторите попытку.");
    }
    return result;
  }, []);

  useEffect(() => { let alive = true; api("/session").then(data => { if (alive) setUsername(data.username); }).catch(() => {}).finally(() => { if (alive) setChecking(false); }); return () => { alive = false; }; }, [api]);
  useEffect(() => {
    if (!username || document) return;
    let alive = true;
    api("/content").then(data => { if (alive) { setDocument(data); setDirty(false); } }).catch(error => { if (alive) setNotice({ text: error.message, error: true }); });
    return () => { alive = false; };
  }, [username, document, api]);
  useEffect(() => {
    if (!username) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setInboxLoading(true); setInboxError("");
      api(`/enquiries?limit=12&offset=${offset}&q=${encodeURIComponent(query)}&status=${filter}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setInbox(data); }).catch(error => { if (!controller.signal.aborted) setInboxError(error.message); }).finally(() => { if (!controller.signal.aborted) setInboxLoading(false); });
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [username, query, filter, offset, refresh, tab, api]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = window.document.activeElement as HTMLElement | null;
    const oldOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelected(null); setProjectIndex(null); }
      if (event.key === "Tab") {
        const elements = [...(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea, select') ?? [])].filter(el => el.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && window.document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); window.document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [dialogOpen]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setLoginError("");
    const data = new FormData(event.currentTarget);
    try { const result = await api("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) }); setUsername(result.username); setNotice(null); }
    catch (error) { setLoginError((error as Error).message); } finally { setBusy(false); }
  }
  async function logout() {
    if (dirty && !window.confirm("Выйти без сохранения изменений?")) return;
    try { await api("/logout", { method: "POST" }); setUsername(null); setDocument(null); setDirty(false); setSelected(null); setInbox({ items: [], counts: {}, total: 0 }); }
    catch (error) { setNotice({ text: (error as Error).message, error: true }); }
  }
  function changeContent(data: SiteContent) { if (document) { setDocument({ ...document, data }); setDirty(true); setNotice(null); } }
  function changeProject(patch: Partial<ManagedProject>) {
    if (!document || projectIndex === null) return;
    setDocument(current => current ? { ...current, data: { ...current.data, projects: current.data.projects.map((p, i) => i === projectIndex ? { ...p, ...patch } : p) } } : current);
    setDirty(true); setNotice(null);
  }
  async function save() {
    if (!document) return;
    setBusy(true); setNotice(null);
    try {
      const result = await api("/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(document) });
      const unchanged = latestDocument.current === document;
      setDocument(current => unchanged ? result : current ? { ...current, revision: result.revision } : result);
      setDirty(!unchanged);
      setNotice({ text: unchanged ? "Изменения сохранены. Опубликованные материалы уже на сайте." : "Сохранено. Последние правки ещё не отправлены — нажмите «Сохранить» ещё раз.", error: false });
    }
    catch (error) { setNotice({ text: (error as Error).message, error: true }); } finally { setBusy(false); }
  }
  async function upload(file: File | undefined, gallery = false) {
    if (!file || !document || projectIndex === null) return;
    if (file.size > 8 * 1024 * 1024) { setNotice({ text: "Изображение должно быть меньше 8 МБ.", error: true }); return; }
    setUploading(true);
    try { const result = await api("/media", { method: "POST", headers: { "Content-Type": file.type }, body: file }); changeProject(gallery ? { gallery: [...document.data.projects[projectIndex].gallery, result.url] } : { image: result.url }); }
    catch (error) { setNotice({ text: (error as Error).message, error: true }); } finally { setUploading(false); }
  }
  async function changeStatus(status: Status) {
    if (!selected) return;
    setStatusBusy(true);
    try { await api(`/enquiries/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); setSelected({ ...selected, status }); setRefresh(v => v + 1); }
    catch (error) { setNotice({ text: (error as Error).message, error: true }); } finally { setStatusBusy(false); }
  }
  function addProject() {
    if (!document) return;
    const index = document.data.projects.length;
    changeContent({ ...document.data, projects: [...document.data.projects, { slug: `project-${Date.now()}`, number: String(index + 1).padStart(2, "0"), name: "Новый проект", category: "Графика", label: "", image: "/images/architecture.jpg", description: "", role: "", tasks: [], tools: [], gallery: [], disclosure: "", published: false }] });
    setProjectIndex(index);
  }
  function moveProject(index: number, direction: number) {
    if (!document) return;
    const projects = [...document.data.projects];
    [projects[index], projects[index + direction]] = [projects[index + direction], projects[index]];
    changeContent({ ...document.data, projects: projects.map((p, i) => ({ ...p, number: String(i + 1).padStart(2, "0") })) });
  }

  const content = document?.data;
  const project = projectIndex === null ? null : content?.projects[projectIndex];
  const total = Object.values(inbox.counts).reduce((a, b) => a + (b ?? 0), 0);
  const published = content?.projects.filter(p => p.published).length ?? 0;

  if (checking) return <main id="main" className="admin-shell adm-check"><LoaderCircle className="spin" /><p>Открываем мастерскую…</p></main>;
  if (!username) return <main id="main" className="admin-shell adm-login"><div className="adm-login-art"><a href="/" className="adm-brand" aria-label="На сайт"><Logo /></a><Mark /><div className="adm-login-caption"><span>Roman Koskin</span><span>Личная мастерская</span></div></div><div className="adm-login-side"><form onSubmit={login} className="adm-login-form"><span className="adm-eyebrow">Панель управления</span><h1>С возвращением.</h1><p>Войдите, чтобы управлять сайтом.</p><Field label="Логин"><input name="username" autoComplete="username" required defaultValue="roman" maxLength={100} /></Field><Field label="Пароль"><input name="password" type="password" autoComplete="current-password" required maxLength={256} /></Field>{loginError && <p role="alert" className="adm-error">{loginError}</p>}<button className="adm-primary" disabled={busy}>{busy ? <LoaderCircle size={18} className="spin" /> : <>Войти в мастерскую <ArrowUpRight size={19} /></>}</button><a className="adm-back" href="/">← Вернуться на сайт</a></form></div></main>;

  return <div className="admin-shell adm-workspace">
    <aside className="adm-sidebar"><a href="/" className="adm-brand" aria-label="На сайт"><Logo /></a><span className="adm-sidebar-caption">Мастерская Романа</span><nav aria-label="Панель управления">{tabs.map(item => <button key={item.id} aria-current={tab === item.id ? "page" : undefined} onClick={() => { setTab(item.id); setNotice(null); setProjectIndex(null); setSelected(null); if (item.id === "overview") { setQuery(""); setFilter(""); setOffset(0); } }}><item.icon size={19} strokeWidth={1.5} /><span>{item.label}</span>{item.id === "enquiries" && !!inbox.counts.new && <small>{inbox.counts.new}</small>}</button>)}</nav><div className="adm-sidebar-bottom"><a href="/" target="_blank" rel="noopener noreferrer">Открыть сайт <ExternalLink size={15} /></a><button onClick={logout}><LogOut size={17} />Выйти</button><div className="adm-owner"><span>РК</span><div>{username}<small>Владелец сайта</small></div></div></div></aside>
    <main id="main" className="adm-main"><header className="adm-topbar"><span>ROMAN KOSKIN <span className="adm-divider">/</span> {tabs.find(t => t.id === tab)?.label}</span><div><button className="adm-mobile-logout" aria-label="Выйти из админки" onClick={logout}><LogOut size={17} /></button><span className="adm-save-state"><Circle size={7} fill="currentColor" />{dirty ? "Есть изменения" : "Всё сохранено"}</span><button className="adm-primary adm-save" onClick={save} disabled={!dirty || busy || uploading}>{busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}Сохранить</button></div></header>
      {notice && <div className={`adm-notice ${notice.error ? "is-error" : ""}`} role={notice.error ? "alert" : "status"}>{notice.error ? <Circle size={16} /> : <Check size={16} />}<span>{notice.text}</span><button aria-label="Закрыть уведомление" onClick={() => setNotice(null)}><X size={16} /></button></div>}
      {!content ? <div className="adm-empty"><LoaderCircle className="spin" /><p>Загружаем контент…</p><button onClick={() => window.location.reload()}>Повторить загрузку</button></div> : <AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22 }}>
      {tab === "overview" && <><div className="adm-page-heading"><div><span className="adm-eyebrow">Всё под рукой</span><h1>Ваша мастерская.</h1></div><span className="adm-today">{new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", year: "numeric" }).format(new Date())}</span></div><section className="adm-welcome adm-raised"><div><span className="adm-eyebrow">Портфолио · Roman Koskin</span><h2>Портфолио<br />и обращения.</h2><p>Публикации, черновики и сообщения<br />от будущих заказчиков.</p><button className="adm-primary" onClick={() => setTab("projects")}>К портфолио <ArrowUpRight size={18} /></button></div><Mark /></section><div className="adm-stats"><button className="adm-stat adm-raised" onClick={() => { setFilter("new"); setOffset(0); setTab("enquiries"); }}><span><Inbox size={18} />Новые обращения</span><strong>{inboxError ? "—" : inbox.counts.new ?? 0}</strong><small>Ждут вашего ответа <ArrowUpRight size={16} /></small></button><button className="adm-stat adm-raised" onClick={() => setTab("projects")}><span><FileText size={18} />Опубликовано работ</span><strong>{published.toString().padStart(2, "0")}</strong><small>{content.projects.length - published} в черновиках <ArrowUpRight size={16} /></small></button><button className="adm-stat adm-raised" onClick={() => { setFilter(""); setOffset(0); setTab("enquiries"); }}><span><Check size={18} />Всего обращений</span><strong>{inboxError ? "—" : total}</strong><small>История сотрудничества <ArrowUpRight size={16} /></small></button></div><section className="adm-panel"><div className="adm-section-heading"><h2>Последние обращения</h2><button onClick={() => setTab("enquiries")}>Все заявки <ArrowUpRight size={16} /></button></div>{inboxError ? <p className="adm-error">{inboxError}</p> : inboxLoading ? <p className="adm-empty">Загружаем…</p> : inbox.items.length ? inbox.items.slice(0, 4).map(item => <button className="adm-recent" key={item.id} onClick={() => setSelected(item)}><span className="adm-avatar">{item.name.slice(0, 1)}</span><span><b>{item.name}</b><small>{item.direction || "Без направления"}</small></span><span className={`adm-badge ${item.status}`}>{statuses[item.status]}</span><time>{date(item.created_at)}</time><ArrowUpRight size={17} /></button>) : <div className="adm-empty"><Inbox size={26} /><h3>Здесь начнутся новые проекты.</h3><p>Обращения из формы на сайте появятся автоматически.</p></div>}</section></>}
      {tab === "enquiries" && <><div className="adm-page-heading"><div><span className="adm-eyebrow">Разговор о будущих проектах</span><h1>Обращения<span className="adm-title-count">{total}</span></h1></div><button className="adm-secondary" onClick={() => setRefresh(v => v + 1)}>Обновить</button></div><div className="adm-inbox-tools"><div className="adm-tabs" aria-label="Статус обращений">{[["", "Все"], ["new", "Новые"], ["active", "В работе"], ["closed", "Закрытые"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setOffset(0); }}>{label}</button>)}</div><label className="adm-search"><Search size={17} /><input aria-label="Поиск обращений" placeholder="Имя, почта или сообщение" value={query} onChange={e => { setQuery(e.target.value); setOffset(0); }} /></label></div><section className="adm-panel adm-inbox" aria-busy={inboxLoading}>{inboxError ? <p role="alert" className="adm-error">{inboxError}</p> : inboxLoading ? <div className="adm-empty"><LoaderCircle className="spin" /><p>Загружаем обращения…</p></div> : inbox.items.length ? inbox.items.map(item => <button key={item.id} className="adm-enquiry" onClick={() => setSelected(item)}><span className="adm-avatar">{item.name.slice(0, 1)}</span><span className="adm-enquiry-main"><b>{item.name}</b><span>{item.direction || "Без направления"}</span><p>{item.message}</p></span><span className="adm-enquiry-meta"><span className={`adm-badge ${item.status}`}>{statuses[item.status]}</span><time>{date(item.created_at)}</time></span><ArrowUpRight size={19} /></button>) : <div className="adm-empty"><Inbox size={30} /><h3>{query || filter ? "Ничего не найдено" : "Пока нет обращений"}</h3><p>{query || filter ? "Попробуйте другой запрос или статус." : "Заявки из формы появятся здесь."}</p></div>}<div className="adm-pagination"><span>{inbox.total ? `${offset + 1}–${Math.min(offset + 12, inbox.total)} из ${inbox.total}` : "0 обращений"}</span><div><button aria-label="Предыдущая страница" disabled={offset === 0 || inboxLoading} onClick={() => setOffset(v => Math.max(0, v - 12))}><ChevronLeft size={18} /></button><button aria-label="Следующая страница" disabled={offset + 12 >= inbox.total || inboxLoading} onClick={() => setOffset(v => v + 12)}><ChevronRight size={18} /></button></div></div></section></>}
      {tab === "projects" && <><div className="adm-page-heading"><div><span className="adm-eyebrow">То, что увидят заказчики</span><h1>Портфолио<span className="adm-title-count">{content.projects.length}</span></h1></div><button className="adm-primary" onClick={addProject} disabled={busy}><Plus size={18} />Добавить проект</button></div><p className="adm-page-note">Меняйте порядок стрелками. Черновики видны только здесь. После редактирования нажмите «Сохранить».</p><div className="adm-project-grid">{content.projects.map((p, index) => <article className="adm-project adm-raised" key={`${p.slug}-${index}`}><button className="adm-project-cover" onClick={() => setProjectIndex(index)} aria-label={`Редактировать ${p.name}`}><img src={p.image} alt={p.name} /><span className={`adm-badge ${p.published ? "active" : "closed"}`}>{p.published ? "На сайте" : "Черновик"}</span><span className="adm-edit-project"><ArrowUpRight size={22} /></span></button><div className="adm-project-body"><small>{p.category} · {p.number}</small><h2><button onClick={() => setProjectIndex(index)}>{p.name}</button></h2><p>{p.label || "Добавьте описание"}</p><div className="adm-project-actions"><button onClick={() => setProjectIndex(index)}>Редактировать <ArrowUpRight size={15} /></button><div><button aria-label={`Поднять ${p.name}`} disabled={index === 0 || busy} onClick={() => moveProject(index, -1)}><ArrowUp size={16} /></button><button aria-label={`Опустить ${p.name}`} disabled={index === content.projects.length - 1 || busy} onClick={() => moveProject(index, 1)}><ArrowDown size={16} /></button></div></div></div></article>)}</div></>}
      {tab === "settings" && <><div className="adm-page-heading"><div><span className="adm-eyebrow">Ваш голос и детали</span><h1>Контент сайта.</h1></div></div><div className="adm-settings-grid"><section className="adm-panel"><h2>О себе</h2><p className="adm-panel-note">Текст в секции «Обо мне» на главной странице.</p>{([['about','Основной текст'],['biography','Опыт и практика'],['extra','Дополнительно']] as const).map(([key, label]) => <Field key={key} label={label}><textarea rows={key === 'biography' ? 5 : 3} maxLength={key === 'biography' ? 5000 : 2000} value={content.settings[key]} onChange={e => changeContent({ ...content, settings: { ...content.settings, [key]: e.target.value } })} /></Field>)}</section><section className="adm-panel"><h2>Контакты</h2><p className="adm-panel-note">Ссылки для связи внизу главной страницы.</p>{([['email','Электронная почта'],['phone','Телефон'],['telegram','Telegram · https://t.me/username']] as const).map(([key,label]) => <Field key={key} label={label}><input type={key === 'email' ? 'email' : key === 'telegram' ? 'url' : 'tel'} value={content.settings[key]} onChange={e => changeContent({ ...content, settings: { ...content.settings, [key]: e.target.value } })} /></Field>)}</section><section className="adm-panel adm-services-editor"><div className="adm-section-heading"><h2>Услуги</h2><button disabled={content.settings.services.length >= 12} onClick={() => changeContent({ ...content, settings: { ...content.settings, services: [...content.settings.services, { name: "Новая услуга", text: "Описание услуги" }] } })}><Plus size={16} />Добавить</button></div>{content.settings.services.map((service, i) => <div className="adm-service-editor" key={i}><Field label={`Услуга ${i + 1}`}><input value={service.name} maxLength={100} onChange={e => changeContent({ ...content, settings: { ...content.settings, services: content.settings.services.map((s,j) => i === j ? { ...s, name: e.target.value } : s) } })} /></Field><Field label="Описание"><textarea rows={3} value={service.text} maxLength={2000} onChange={e => changeContent({ ...content, settings: { ...content.settings, services: content.settings.services.map((s,j) => i === j ? { ...s, text: e.target.value } : s) } })} /></Field></div>)}</section><section className="adm-panel"><h2>Поисковая выдача</h2><p className="adm-panel-note">Заголовок вкладки и описание сайта для поиска.</p><Field label="Название сайта"><input value={content.settings.seoTitle} maxLength={150} onChange={e => changeContent({ ...content, settings: { ...content.settings, seoTitle: e.target.value } })} /></Field><Field label="Описание"><textarea rows={4} value={content.settings.seoDescription} maxLength={500} onChange={e => changeContent({ ...content, settings: { ...content.settings, seoDescription: e.target.value } })} /></Field><div className="adm-seo-preview"><span>ROMAN KOSKIN</span><h3>{content.settings.seoTitle}</h3><p>{content.settings.seoDescription}</p></div></section></div></>}
      </motion.div></AnimatePresence>}
      <footer className="adm-footer"><span>rk. / мастерская</span><span>Контент хранится в базе сайта</span></footer>
    </main>
    {(selected || project) && <div className="adm-overlay" onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setProjectIndex(null); } }}><section ref={drawer} className="adm-drawer" role="dialog" aria-modal="true" aria-label={selected ? "Обращение" : "Редактор проекта"} data-lenis-prevent><header><span>{selected ? "Обращение" : "Редактор проекта"}</span><button autoFocus aria-label="Закрыть редактор" onClick={() => { setSelected(null); setProjectIndex(null); }}><X size={21} /></button></header>
      {notice && (project || notice.error) && <div className={`adm-notice ${notice.error ? "is-error" : ""}`} role={notice.error ? "alert" : "status"}>{notice.text}</div>}{selected && <><div className="adm-drawer-title"><span className={`adm-badge ${selected.status}`}>{statuses[selected.status]}</span><h2>{selected.name}</h2><time>{date(selected.created_at)}</time></div><div className="adm-message-meta"><span>Направление<strong>{selected.direction || "Не указано"}</strong></span><span>Почта<a href={`mailto:${selected.email}`}>{selected.email}<ArrowUpRight size={16} /></a></span></div><div className="adm-message">{selected.message}</div><div className="adm-status-buttons">{(Object.entries(statuses) as [Status,string][]).map(([value,label]) => <button key={value} disabled={statusBusy} aria-pressed={selected.status === value} onClick={() => changeStatus(value)}>{selected.status === value && <Check size={15} />}{label}</button>)}</div><a className="adm-primary" href={`mailto:${selected.email}?subject=${encodeURIComponent('Ваше обращение · Roman Koskin')}`}>Ответить по почте <ArrowUpRight size={18} /></a></>}
      {project && content && <><div className="adm-drawer-title"><span className="adm-eyebrow">{project.category}</span><h2>{project.name}</h2></div><div className="adm-publish"><div><strong>Публикация</strong><span>{project.published ? "Появится на сайте после сохранения" : "Черновик · скрыт от посетителей"}</span></div><button className="adm-switch" role="switch" aria-label="Опубликовать проект" aria-checked={project.published} onClick={() => changeProject({ published: !project.published })}><span /></button></div><Field label="Название"><input value={project.name} maxLength={150} onChange={e => changeProject({ name: e.target.value })} /></Field><div className="adm-form-columns"><Field label="Адрес · латиница и дефисы"><input value={project.slug} maxLength={100} onChange={e => changeProject({ slug: e.target.value })} /></Field><Field label="Категория"><select value={project.category} onChange={e => changeProject({ category: e.target.value as ManagedProject['category'] })}>{['Графика','Брендинг','Пространство'].map(value => <option key={value}>{value}</option>)}</select></Field></div><Field label="Подпись на главной"><input value={project.label} maxLength={200} onChange={e => changeProject({ label: e.target.value })} /></Field><div className="adm-cover-editor"><img src={project.image} alt="Обложка проекта" /><label className="adm-upload"><Upload size={17} />{uploading ? "Загружаем…" : "Заменить обложку"}<input disabled={uploading} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><small>JPG, PNG, WebP · до 8 МБ</small></div><Field label="Описание проекта"><textarea rows={5} value={project.description} maxLength={5000} onChange={e => changeProject({ description: e.target.value })} /></Field><Field label="Роль / участие"><input value={project.role} maxLength={300} onChange={e => changeProject({ role: e.target.value })} /></Field><Field label="Задачи · каждая с новой строки"><textarea rows={4} value={project.tasks.join('\n')} onChange={e => changeProject({ tasks: e.target.value.split('\n') })} /></Field><Field label="Инструменты · каждый с новой строки"><textarea rows={3} value={project.tools.join('\n')} onChange={e => changeProject({ tools: e.target.value.split('\n') })} /></Field><Field label="Подпись под обложкой / авторство"><textarea rows={2} maxLength={1000} value={project.disclosure} onChange={e => changeProject({ disclosure: e.target.value })} /></Field><div className="adm-gallery-editor"><h3>Галерея проекта</h3><div>{project.gallery.map((src, i) => <figure key={`${src}-${i}`}><img src={src} alt={`Галерея ${i + 1}`} /><button aria-label={`Убрать изображение ${i + 1} из галереи`} onClick={() => changeProject({ gallery: project.gallery.filter((_, j) => i !== j) })}><X size={15} /></button></figure>)}</div><label className="adm-upload"><Plus size={17} />Добавить изображение<input type="file" disabled={uploading || project.gallery.length >= 20} accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0], true); e.target.value = ''; }} /></label></div><div className="adm-drawer-save"><span>{dirty ? 'Изменения ещё не сохранены' : 'Изменения сохранены'}</span><button className="adm-primary" onClick={save} disabled={!dirty || busy || uploading}>{busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Сохранить</button></div></>}
    </section></div>}
  </div>;
}
