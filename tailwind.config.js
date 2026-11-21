/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5F0',
          100: '#FFE8DE',
          200: '#FED0BD',
          300: '#FCAE92',
          400: '#F88560',
          500: '#F26B3A', // Primary accent from screenshot
          600: '#E05220',
          700: '#BC3E14',
          800: '#953416',
          900: '#792E17',
          950: '#421408',
        },
        surface: {
          warm: '#FAF7F5', // warm off-white from screenshot
          card: '#FFFFFF',
          dark: '#141416',
          darkCard: '#1C1C1F',
          darkBorder: '#2E2E33',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'soft-hover': '0 8px 24px rgba(242, 107, 58, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 1px 1px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
