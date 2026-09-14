import type { Config } from 'tailwindcss';

/** Source-of-truth brand tokens mirrored from nextjs/admin */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#061a3a', 800: '#0b234a', 700: '#123163', 600: '#1c4b8f' },
        gold: { DEFAULT: '#c8a24a', soft: '#e2c67f', deep: '#8a6a20' },
        muted: { DEFAULT: '#c3cbdd', dim: '#8f9bb8', nav: '#cdd4e6' },
        cream: { DEFAULT: '#f8f5ee', soft: '#fbf9f4', line: '#ece6d8', line2: '#e6dfd0' },
        ink: { DEFAULT: '#1c1a17', soft: '#4f5766', dim: '#8a8478', faint: '#a8a29a' },
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-messiri)', 'serif'],
        latin: ['var(--font-grotesk)', 'sans-serif'],
      },
      borderRadius: { xl2: '18px', xl3: '22px' },
      boxShadow: {
        gold: '0 18px 40px -14px rgba(200,162,74,.55)',
        card: '0 18px 38px -18px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
};

export default config;
