import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        steel: '#334155',
        mist: '#E2E8F0',
        sun: '#F59E0B',
        mint: '#14B8A6',
        ember: '#DC2626',
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 32px rgba(15,23,42,0.12)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 10% 20%, rgba(20,184,166,0.22), transparent 45%), radial-gradient(circle at 85% 10%, rgba(245,158,11,0.2), transparent 40%), linear-gradient(180deg, #f8fafc 0%, #ecfeff 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
