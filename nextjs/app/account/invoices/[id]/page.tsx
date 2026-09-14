'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';

function InvoiceViewInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const id = params.id;
  const autoPrint = search.get('print') === '1';

  useEffect(() => {
    if (!autoPrint || !iframeRef.current) return;
    const frame = iframeRef.current;
    function onLoad() {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }
    frame.addEventListener('load', onLoad);
    return () => frame.removeEventListener('load', onLoad);
  }, [autoPrint, id]);

  function printInvoice() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/invoices" className="text-[13px] text-[#8a8478]">
            ← الفواتير
          </Link>
          <h2 className="mt-1 text-[22px] font-extrabold">عرض الفاتورة</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printInvoice}
            className="rounded-full border border-[#e5dfd0] bg-white px-4 py-2 text-[12.5px] font-bold text-navy-800"
          >
            طباعة
          </button>
          <a
            href={`/api/guardian/invoices/${id}/pdf`}
            download
            className="rounded-full border border-[#e5dfd0] bg-white px-4 py-2 text-[12.5px] font-bold text-navy-800"
          >
            تحميل PDF
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ece6d8] bg-white shadow-sm">
        <iframe
          ref={iframeRef}
          title="الفاتورة"
          src={`/api/guardian/invoices/${id}/html`}
          className="min-h-[920px] w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}

export default function InvoiceViewPage() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>}>
      <InvoiceViewInner />
    </Suspense>
  );
}
