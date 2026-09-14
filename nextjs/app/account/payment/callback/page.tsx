'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function readPaymentId(search: URLSearchParams) {
  return (
    search.get('paymentId') ||
    search.get('PaymentId') ||
    search.get('Id') ||
    search.get('id')
  );
}

function PaymentReturnInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('جاري التحقق من الدفع…');

  useEffect(() => {
    void (async () => {
      const paymentId = readPaymentId(search);

      const fromQuery = search.get('student_id');
      const fromStore =
        typeof window !== 'undefined' ? sessionStorage.getItem('pay_return_student_id') : null;
      const studentId = fromQuery || fromStore;
      const installment =
        typeof window !== 'undefined' ? sessionStorage.getItem('pay_return_installment') : null;
      const invoiceId =
        typeof window !== 'undefined' ? sessionStorage.getItem('pay_return_invoice_id') : null;

      if (!paymentId) {
        setState('failed');
        setMessage('لم يصل رقم عملية الدفع — حاول مرة أخرى.');
        return;
      }

      try {
        const res = await fetch('/api/guardian/payments/myfatoorah/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: paymentId }),
        });
        const json = await res.json().catch(() => ({}));

        if (res.ok && (json.status === 'processed' || json.status === 'ignored')) {
          setState('success');
          setMessage('تم تأكيد الدفع بنجاح');

          if (fromStore) sessionStorage.removeItem('pay_return_student_id');
          if (installment) sessionStorage.removeItem('pay_return_installment');
          if (invoiceId) sessionStorage.removeItem('pay_return_invoice_id');

          const params = new URLSearchParams({ paid: '1' });
          if (installment === '1') {
            params.set('installment', '1');
            if (invoiceId) params.set('invoice_id', invoiceId);
          }

          const target = studentId
            ? `/portal/children/${studentId}?${params.toString()}`
            : '/account/invoices?paid=1';

          window.setTimeout(() => router.replace(target), 900);
          return;
        }

        setState('failed');
        setMessage(json.message || 'لم تكتمل عملية الدفع');
      } catch {
        setState('failed');
        setMessage('تعذّر الاتصال بالخادم — تحقق من حالة الفاتورة لاحقًا');
      }
    })();
  }, [router, search]);

  if (state === 'loading') {
    return <p className="p-8 text-center text-[14px] text-[#8a8478]">{message}</p>;
  }

  if (state === 'success') {
    return <p className="p-8 text-center text-[14px] text-[#2e7d4f]">{message}</p>;
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[#f2dede] bg-white p-8 text-center">
      <h1 className="text-[18px] font-extrabold text-[#a34b4b]">لم تكتمل عملية الدفع</h1>
      <p className="mt-2 text-[14px] text-[#8a8478]">{message}</p>
      <p className="mt-3 text-[12.5px] text-[#aba59a]">
        KNET تجريبي: البطاقة 8888880000000001 — انتهاء 09/30 — أي PIN من 4 أرقام
      </p>
      <Link
        href="/account/invoices"
        className="mt-5 inline-block rounded-full bg-navy-800 px-5 py-2.5 text-[13px] font-extrabold text-gold"
      >
        العودة للفواتير
      </Link>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-[14px] text-[#8a8478]">جاري التحميل…</p>}>
      <PaymentReturnInner />
    </Suspense>
  );
}
