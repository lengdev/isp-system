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
          500: '#F26B3A', // Primary accent
          600: '#E05220',
          700: '#BC3E14',
          800: '#953416',
          900: '#792E17',
          950: '#421408',
        },
        surface: {
          warm: '#FAF7F5', // warm off-white
          card: '#FFFFFF',
          dark: '#121214',
          darkCard: '#1C1C1F',
          darkBorder: '#2E2E33',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '14px'],
        'xs': ['12px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['14px', '20px'],
        'md': ['16px', '24px'],
        'lg': ['20px', '28px'],
        'xl': ['28px', '34px'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(16, 24, 40, 0.04)',
        'soft': '0 1px 2px rgba(16, 24, 40, 0.04)',
        'soft-hover': '0 4px 16px rgba(242, 107, 58, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'modal': '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        'popover': '0 8px 24px -4px rgba(16, 24, 40, 0.12), 0 2px 6px -1px rgba(16, 24, 40, 0.04)',
      },
      borderRadius: {
        'control': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
