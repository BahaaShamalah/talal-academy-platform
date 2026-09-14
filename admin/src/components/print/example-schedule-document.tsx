'use client';

/**
 * Example document body only — header/footer come from PrintableLayout.
 * Structural demo for the official A4 shell (not a live schedule).
 */
export function ExampleScheduleDocument() {
  return (
    <>
      <div className="ta-print-meta ta-print-avoid-break">
        <div className="ta-print-meta__item">
          <span className="ta-print-meta__label">المرحلة</span>
          <span className="ta-print-meta__value">المرحلة المتوسطة</span>
        </div>
        <div className="ta-print-meta__item">
          <span className="ta-print-meta__label">الصف</span>
          <span className="ta-print-meta__value">الصف السادس</span>
        </div>
        <div className="ta-print-meta__item">
          <span className="ta-print-meta__label">الشعبة</span>
          <span className="ta-print-meta__value">الشعبة (1)</span>
        </div>
      </div>

      <table className="ta-print-table ta-print-avoid-break">
        <thead>
          <tr>
            <th>الوقت</th>
            <th>السبت</th>
            <th>الأحد</th>
            <th>الإثنين</th>
            <th>الثلاثاء</th>
            <th>الأربعاء</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>6:30 م – 7:30 م</td>
            <td>الرياضيات</td>
            <td>العلوم</td>
            <td>الرياضيات</td>
            <td>اللغة العربية</td>
            <td>اللغة العربية</td>
          </tr>
          <tr>
            <td>7:30 م – 8:30 م</td>
            <td>اللغة الإنجليزية</td>
            <td>اللغة العربية</td>
            <td>اللغة الإنجليزية</td>
            <td>الرياضيات</td>
            <td>العلوم</td>
          </tr>
        </tbody>
      </table>

      <div className="ta-print-note ta-print-avoid-break">
        <strong>ملاحظات:</strong>
        <div style={{ marginTop: '1.5mm' }}>لا توجد ملاحظات في الجدول.</div>
      </div>
    </>
  );
}
