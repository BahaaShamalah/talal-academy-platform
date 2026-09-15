import Link from 'next/link';
import { notFound } from 'next/navigation';

export type LegalPagePayload = {
  page_key: string;
  title: string;
  content: string;
  updated_at?: string;
};

export async function fetchLegalPage(key: string): Promise<LegalPagePayload | null> {
  const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
  try {
    const res = await fetch(`${backend}/api/v1/public/legal-pages/${key}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as LegalPagePayload | { data: LegalPagePayload };
    if (json && typeof json === 'object' && 'data' in json && json.data) {
      return json.data;
    }
    return json as LegalPagePayload;
  } catch {
    return null;
  }
}

export function LegalDocument({ page }: { page: LegalPagePayload }) {
  const paragraphs = page.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#061a3a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-[13px] font-semibold text-gold-soft hover:text-gold">
          ← العودة للموقع
        </Link>
        <h1 className="mt-6 font-display text-[clamp(28px,4vw,40px)] font-bold text-white">
          {page.title}
        </h1>
        {/* NOTE: المحتوى من قاعدة البيانات؛ النصوص الافتراضية عامة وتحتاج مراجعة قانونية بشرية. */}
        <article className="mt-8 space-y-4 rounded-[18px] border border-white/10 bg-white/[.04] p-5 sm:p-7">
          {paragraphs.map((block, i) => (
            <p
              key={i}
              className="whitespace-pre-line text-[14.5px] leading-[1.85] text-[#d7dde8]"
            >
              {block}
            </p>
          ))}
        </article>
      </div>
    </main>
  );
}

export async function loadOrNotFound(key: string): Promise<LegalPagePayload> {
  const page = await fetchLegalPage(key);
  if (!page) notFound();
  return page;
}
