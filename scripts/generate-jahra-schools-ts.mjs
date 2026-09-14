import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = {
  primary: {
    boys: path.join(os.tmpdir(), 'SchoolsPrimaryB.html'),
    girls: path.join(os.tmpdir(), 'SchoolsPrimaryG.html'),
  },
  intermediate: {
    boys: path.join(os.tmpdir(), 'SchoolsIntermediateB.html'),
    girls: path.join(os.tmpdir(), 'SchoolsIntermediateG.html'),
  },
  secondary: {
    boys: path.join(os.tmpdir(), 'SchoolsSecondaryB.html'),
    girls: path.join(os.tmpdir(), 'SchoolsSecondaryG.html'),
  },
};

function extract(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const start = content.indexOf('محافظة الجهراء');
  if (start < 0) return [];

  let end = content.indexOf('محافظة مبارك', start);
  if (end < 0) end = start + 25000;

  const section = content.slice(start, end);
  const re = /<tr[^>]*>\s*<td><span>([^<]+)<\/span><\/td>/g;
  const names = [];
  let match;
  while ((match = re.exec(section)) !== null) {
    const name = match[1].trim();
    if (name && !/^\d+$/.test(name) && !name.includes('قطعة') && !name.includes('شارع')) {
      names.push(name);
    }
  }

  return names;
}

const data = {};
for (const [level, paths] of Object.entries(files)) {
  const names = [...extract(paths.boys), ...extract(paths.girls)];
  data[level] = [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ar'));
}

const ts = `/** مدارس حكومية — محافظة الجهراء (مصدر: e.gov.kw / وزارة التربية) */
export type SchoolLevel = 'primary' | 'intermediate' | 'secondary';

export type SchoolLevelOption = {
  id: SchoolLevel;
  label: string;
};

export const JAHRA_SCHOOL_LEVELS: SchoolLevelOption[] = [
  { id: 'primary', label: 'ابتدائي' },
  { id: 'intermediate', label: 'متوسط' },
  { id: 'secondary', label: 'ثانوي' },
];

export const JAHRA_SCHOOLS: Record<SchoolLevel, string[]> = ${JSON.stringify(data, null, 2)};

export function schoolsForLevel(level: SchoolLevel): string[] {
  return JAHRA_SCHOOLS[level] ?? [];
}

export function allJahraSchools(): string[] {
  return [
    ...JAHRA_SCHOOLS.primary,
    ...JAHRA_SCHOOLS.intermediate,
    ...JAHRA_SCHOOLS.secondary,
  ].sort((a, b) => a.localeCompare(b, 'ar'));
}
`;

for (const dir of ['admin/src/lib', 'nextjs/src/lib']) {
  fs.writeFileSync(path.join(__dirname, '..', dir, 'jahra-schools.ts'), ts, 'utf8');
}

console.log(
  `Generated: primary=${data.primary.length}, intermediate=${data.intermediate.length}, secondary=${data.secondary.length}`,
);

