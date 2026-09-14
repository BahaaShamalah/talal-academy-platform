import fs from 'fs';
import path from 'path';
import os from 'os';

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

const out = {};

for (const [level, paths] of Object.entries(files)) {
  const names = [...extract(paths.boys), ...extract(paths.girls)];
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ar'));
  out[level] = unique;
}

console.log(JSON.stringify(out, null, 2));
