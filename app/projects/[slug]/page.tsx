import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getContent } from "@/lib/server-content";
import Header from "@/components/header";
import Reveal from "@/components/reveal";
import { pageMetadata } from "@/lib/seo";
import { projectStructuredData } from "@/lib/structured-data";
import StructuredData from "@/components/structured-data";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const { projects } = await getContent(); const p = projects.find(p => p.slug === slug);
  if (!p) notFound();
  return pageMetadata({ title: `${p.name} — ${p.role || p.category} | Роман Коськин`, description: p.description, path: `/projects/${p.slug}`, image: p.image });
}
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { projects, settings } = await getContent(); const p = projects.find(p => p.slug === slug);
  if (!p) notFound();
  const next = projects[(projects.indexOf(p) + 1) % projects.length];
  return <><StructuredData data={projectStructuredData(p)} /><Header inner /><main id="main" className="project-page section-pad"><Link href="/#work" className="back-link"><ArrowLeft size={17} />Все направления</Link><Reveal><div className="section-kicker"><span>ПРАКТИКА / {p.number}</span><span>{p.category}</span></div><h1>{p.name}</h1><p className="project-lead">{p.description}</p></Reveal><div className="detail-cover"><Image src={p.image} alt={`Иллюстрация направления ${p.label}`} fill priority sizes="100vw" />{p.slug === "trueman" && <div className="trueman-cover">TRUEMAN</div>}</div><p className="detail-disclosure">{p.disclosure}</p><div className="detail-gallery">{p.gallery.map((src, i) => <Image key={`${src}-${i}`} src={src} alt={`${p.name} — изображение ${i + 1}`} width={1600} height={1100} sizes="90vw" unoptimized={src.startsWith("/api/")} />)}</div><div className="detail-layout"><div><span className="eyebrow">УЧАСТИЕ</span><h2>{p.role}</h2><div className="tool-tags">{p.tools.map(t => <span key={t}>{t}</span>)}</div></div><div><span className="eyebrow">НАПРАВЛЕНИЯ РАБОТЫ</span><ul>{p.tasks.map((t, i) => <li key={t}><small>0{i + 1}</small>{t}</li>)}</ul><div className="materials-note"><h3>Авторские материалы</h3><p>Подборку авторских материалов по этому направлению можно запросить напрямую. Напишите, какая задача вас интересует.</p><a href={`${settings.telegram}?text=${encodeURIComponent(`Роман, здравствуйте! Интересуют ваши работы: ${p.name}.`)}`} className="text-link" target="_blank" rel="noopener noreferrer">Запросить работы <ArrowUpRight size={20} /></a></div></div></div><Link href={`/projects/${next.slug}`} className="next-project"><span>СЛЕДУЮЩЕЕ НАПРАВЛЕНИЕ</span><div>{next.name}<ArrowUpRight /></div></Link><Link href="/#contact" className="detail-contact">Обсудить проект <ArrowUpRight size={20} /></Link></main></>;
}
