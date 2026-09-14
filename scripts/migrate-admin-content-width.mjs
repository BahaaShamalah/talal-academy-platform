import fs from 'fs';
import path from 'path';

const root = 'c:/Users/SARA/Projects/talal-backend/admin/src';

const files = [
  'app/dashboard/page.tsx',
  'components/attendance/attendance-hub-page.tsx',
  'components/branches/branches-page.tsx',
  'components/coupons/coupons-page.tsx',
  'components/course-groups/course-group-detail-page.tsx',
  'components/course-groups/course-groups-page.tsx',
  'components/delivery-zones/delivery-zones-page.tsx',
  'components/grades/grades-page.tsx',
  'components/invoices/invoice-detail-page.tsx',
  'components/invoices/invoices-page.tsx',
  'components/orders/orders-page.tsx',
  'components/payroll/my-payroll-page.tsx',
  'components/payroll/payroll-detail-page.tsx',
  'components/payroll/payroll-page.tsx',
  'components/plans/plans-page.tsx',
  'components/products/products-page.tsx',
  'components/semesters/semesters-page.tsx',
  'components/sessions/session-attendance-page.tsx',
  'components/settings/institute-settings-page.tsx',
  'components/stages/stages-page.tsx',
  'components/students/students-page.tsx',
  'components/subjects/subjects-page.tsx',
  'components/teachers/teachers-page.tsx',
  'components/coming-soon.tsx',
  'components/student-files/create-student-page.tsx',
];

function ensureImport(src) {
  if (src.includes("from '@/components/layout/admin-content'")) return src;

  if (src.includes("from '@/components/layout/admin-header'")) {
    return src.replace(
      "import { AdminHeader } from '@/components/layout/admin-header';",
      "import { AdminContent } from '@/components/layout/admin-content';\nimport { AdminHeader } from '@/components/layout/admin-header';",
    );
  }

  // insert after first import block start
  const m = src.match(/^import .+$/m);
  if (m) {
    return src.replace(
      m[0],
      `${m[0]}\nimport { AdminContent } from '@/components/layout/admin-content';`,
    );
  }
  return src;
}

function transformMain(src) {
  // Exact common wrappers first
  const replacements = [
    [/<main className="p-3\.5 sm:p-5">/g, '<AdminContent>'],
    [/<main className="space-y-4 p-3\.5 sm:p-5">/g, '<AdminContent className="space-y-4">'],
    [/<main className="space-y-3 p-3\.5 pb-32 sm:p-5">/g, '<AdminContent className="space-y-3 pb-32">'],
    [/<main className="flex flex-col gap-4 p-3\.5 sm:p-5">/g, '<AdminContent className="flex flex-col gap-4">'],
    [
      /<main className="mx-auto flex max-w-\[760px\] flex-col gap-4 p-3\.5 sm:p-5">/g,
      '<AdminContent className="flex flex-col gap-4">',
    ],
    [/<main className="p-5 text-\[13\.5px\] text-ink-dim">/g, '<AdminContent className="text-[13.5px] text-ink-dim">'],
    [/<main className="p-5 text-\[13px\] text-ink-dim">/g, '<AdminContent className="text-[13px] text-ink-dim">'],
    [/<main className="p-5">/g, '<AdminContent>'],
    [/<\/main>/g, '</AdminContent>'],
  ];

  let out = src;
  for (const [re, to] of replacements) out = out.replace(re, to);

  // Remove overrides that force narrower than 1024
  out = out.replace(/<AdminContent className="max-w-\[760px\]([^"]*)">/g, '<AdminContent className="$1">');
  out = out.replace(/<AdminContent className="">/g, '<AdminContent>');
  out = out.replace(/ className=" +/g, ' className="');
  out = out.replace(/className=" +/g, 'className="');

  return out;
}

let changed = 0;
for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log('MISSING', rel);
    continue;
  }
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  src = ensureImport(src);
  src = transformMain(src);

  // create-student leftover override
  src = src.replace(
    '<AdminContent className="max-w-[760px]">',
    '<AdminContent>',
  );

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    changed++;
    console.log('updated', rel);
  } else {
    console.log('unchanged', rel);
  }
}

console.log(`done: ${changed} files`);
