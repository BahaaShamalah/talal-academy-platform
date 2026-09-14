/** سارة — the onboarding guide. A vector sketch, not a photo; swap in real art if you have it. */
export default function Sara({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 260" className={className} aria-label="سارة — مرشدة التسجيل">
      <ellipse cx="100" cy="252" rx="46" ry="6" fill="#04122a" opacity=".55" />
      <rect x="76" y="196" width="15" height="52" rx="7" fill="#2a2118" />
      <rect x="109" y="196" width="15" height="52" rx="7" fill="#2a2118" />
      <rect x="70" y="242" width="26" height="10" rx="5" fill="#1c4b8f" />
      <rect x="104" y="242" width="26" height="10" rx="5" fill="#1c4b8f" />
      <path d="M54 206 q46 -22 92 0 v-50 q0 -44 -46 -44 t-46 44 z" fill="#c8a24a" />
      <path d="M54 206 q46 -22 92 0 v-16 q-46 -19 -92 0 z" fill="#a8802a" />
      <rect x="42" y="126" width="16" height="60" rx="8" fill="#e2c67f" />
      <rect x="142" y="126" width="16" height="60" rx="8" fill="#e2c67f" />
      <g transform="rotate(-12 158 172)">
        <rect x="142" y="152" width="32" height="40" rx="5" fill="#f8f5ee" />
        <rect x="147" y="160" width="22" height="3" rx="1.5" fill="#c3cbdd" />
        <rect x="147" y="168" width="18" height="3" rx="1.5" fill="#c3cbdd" />
        <rect x="147" y="176" width="14" height="3" rx="1.5" fill="#c8a24a" />
      </g>
      <circle cx="100" cy="84" r="34" fill="#f3d9b4" />
      <path d="M100 40 q-42 0 -42 46 v34 q0 20 14 20 v-40 q0 -34 28 -34 t28 34 v40 q14 0 14 -20 v-34 q0 -46 -42 -46 z" fill="#2a2118" />
      <circle cx="88" cy="84" r="3.6" fill="#2a2118" />
      <circle cx="112" cy="84" r="3.6" fill="#2a2118" />
      <path d="M92 98 q8 7 16 0" stroke="#b8825f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="76" cy="94" r="5" fill="#e8a48c" opacity=".5" />
      <circle cx="124" cy="94" r="5" fill="#e8a48c" opacity=".5" />
    </svg>
  );
}
