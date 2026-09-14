import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:      { DEFAULT: '#061a3a', 800: '#0b234a', 700: '#123163', 600: '#1c4b8f' },
        gold:      { DEFAULT: '#c8a24a', soft: '#e2c67f', deep: '#8a6a20' },
        muted:     { DEFAULT: '#c3cbdd', dim: '#8f9bb8', nav: '#cdd4e6' },
        cream:     { DEFAULT: '#f8f5ee', soft: '#fbf9f4', line: '#ece6d8', line2: '#e6dfd0' },
        ink:       { DEFAULT: '#1c1a17', soft: '#4f5766', dim: '#8a8478', faint: '#a8a29a' },
      },
      fontFamily: {
        sans:    ['var(--font-cairo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-messiri)', 'serif'],
        latin:   ['var(--font-grotesk)', 'sans-serif'],
      },
      borderRadius: { xl2: '18px', xl3: '22px' },
      boxShadow: {
        gold: '0 18px 40px -14px rgba(200,162,74,.55)',
        card: '0 18px 38px -18px rgba(0,0,0,.6)',
      },
      keyframes: {
        fadeUp:    { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        floatY:    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        drift:     { '0%,100%': { transform: 'translate(0,0) rotate(0deg)' }, '50%': { transform: 'translate(-18px,12px) rotate(1.2deg)' } },
        glowPulse: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
        dotsPan:   { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '240px 120px' } },
        blobA:     { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(26px,-22px) scale(1.09)' }, '66%': { transform: 'translate(-18px,18px) scale(.95)' } },
        blobB:     { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-30px,24px) scale(1.12)' } },
        spinSlow:  { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } },
        spinRev:   { from: { transform: 'rotate(360deg)' }, to: { transform: 'rotate(0)' } },
        sheen:     { '0%': { transform: 'translateX(-130%)' }, '100%': { transform: 'translateX(130%)' } },
        sparkle:   { '0%,100%': { opacity: '.2', transform: 'scale(.7)' }, '50%': { opacity: '1', transform: 'scale(1.15)' } },
      },
      animation: {
        fadeUp: 'fadeUp .7s cubic-bezier(.2,.7,.2,1) both',
        floatY: 'floatY 6s ease-in-out infinite',
        drift: 'drift 24s ease-in-out infinite',
        glowPulse: 'glowPulse 9s ease-in-out infinite',
        dotsPan: 'dotsPan 56s linear infinite',
        blobA: 'blobA 18s ease-in-out infinite',
        blobB: 'blobB 22s ease-in-out infinite',
        spinSlow: 'spinSlow 70s linear infinite',
        spinRev: 'spinRev 55s linear infinite',
        sheen: 'sheen 3.4s ease-in-out infinite',
        sparkle: 'sparkle 4.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
