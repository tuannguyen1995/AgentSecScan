/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#070A12',
          card: '#0F172A',
          border: '#1E293B',
          hover: '#1E293B',
          accent: '#06B6D4',
          neon: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
