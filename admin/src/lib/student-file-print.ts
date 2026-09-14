import { openPrintPreviewWindow, printHtmlDocument } from '@/lib/print/print-utils';

/**
 * Open student file with the official A4 shell in a real window (correct scale).
 */
export async function openStudentFilePrint(
  studentId: string,
  targetWindow?: Window | null,
): Promise<void> {
  const preview = targetWindow ?? openPrintPreviewWindow();

  try {
    const res = await fetch(`/api/proxy/students/${studentId}/html`, {
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('تعذر تحميل صفحة الطباعة');
    }

    let html = await res.text();

    if (!html.includes('family=Cairo')) {
      const fontLinks = `
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
`;
      html = html.replace('</head>', `${fontLinks}</head>`);
    }

    await printHtmlDocument(html, preview);
  } catch (err) {
    try {
      preview.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}
