/** Trigger browser print for the current document (A4 CSS handles chrome hide). */
export function triggerPrint(): void {
  if (typeof window === 'undefined') return;
  window.print();
}

/**
 * Open a blank print window synchronously during a user gesture.
 * Must be called before any `await` — otherwise browsers block the popup.
 */
export function openPrintPreviewWindow(): Window {
  if (typeof window === 'undefined') {
    throw new Error('الطباعة متاحة في المتصفح فقط');
  }

  // Do NOT use noopener — it makes window.open return null in Chromium.
  const preview = window.open('about:blank', '_blank', 'width=920,height=1200');
  if (!preview) {
    throw new Error('تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة لهذا الموقع');
  }

  preview.document.open();
  preview.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><title>جاري التحضير…</title></head>
<body style="margin:0;font-family:Tahoma,Arial,sans-serif;background:#f7f4ec;color:#5d6879;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <p style="font-size:15px;font-weight:700;">جاري تحضير المستند للطباعة…</p>
</body>
</html>`);
  preview.document.close();
  return preview;
}

async function waitForPrintAssets(frameWindow: Window): Promise<void> {
  try {
    if (frameWindow.document.fonts?.ready) {
      await frameWindow.document.fonts.ready;
    }
  } catch {
    /* ignore */
  }

  const images = Array.from(frameWindow.document.images ?? []);
  if (images.length > 0) {
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    );
  }

  await new Promise((r) => setTimeout(r, 200));
}

/**
 * Write official A4 HTML into a print window, then trigger print dialog.
 * Pass a window opened via `openPrintPreviewWindow()` during the click handler.
 */
export async function printHtmlDocument(
  html: string,
  targetWindow?: Window | null,
): Promise<void> {
  if (typeof window === 'undefined') return;

  const frameWindow = targetWindow ?? openPrintPreviewWindow();

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  await waitForPrintAssets(frameWindow);

  frameWindow.focus();
  frameWindow.print();
}
