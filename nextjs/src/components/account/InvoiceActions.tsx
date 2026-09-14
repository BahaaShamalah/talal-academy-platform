'use client';

import Link from 'next/link';

export default function InvoiceActions({ invoiceId }: { invoiceId: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href={`/account/invoices/${invoiceId}`}
        className="rounded-full border border-[#e5dfd0] bg-white px-3 py-1.5 text-[11.5px] font-bold text-navy-800"
      >
        عرض
      </Link>
      <a
        href={`/api/guardian/invoices/${invoiceId}/pdf`}
        download
        className="rounded-full border border-[#e5dfd0] bg-white px-3 py-1.5 text-[11.5px] font-bold text-navy-800"
      >
        PDF
      </a>
      <Link
        href={`/account/invoices/${invoiceId}?print=1`}
        className="rounded-full border border-[#e5dfd0] bg-white px-3 py-1.5 text-[11.5px] font-bold text-navy-800"
      >
        طباعة
      </Link>
    </div>
  );
}
