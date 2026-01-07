/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Cores principais do BarberHub
        primaria: {
          DEFAULT: '#d4af37',
          50: '#fdf9e9',
          100: '#faf0c8',
          200: '#f5e08d',
          300: '#eec84a',
          400: '#e5b01e',
          500: '#d4af37',
          600: '#b5890d',
          700: '#90650f',
          800: '#775014',
          900: '#654216',
        },
        secundaria: {
          DEFAULT: '#1a1a2e',
          50: '#f6f6f8',
          100: '#ececf1',
          200: '#d5d6e0',
          300: '#b1b3c5',
          400: '#888ba5',
          500: '#6a6c8b',
          600: '#555672',
          700: '#46475d',
          800: '#3c3d4f',
          900: '#1a1a2e',
        },
        destaque: {
          DEFAULT: '#16213e',
          light: '#1f2d50',
          dark: '#0f172a',
        },
        sucesso: '#10b981',
        erro: '#ef4444',
        aviso: '#f59e0b',
        info: '#3b82f6',
        // Cores de fundo
        fundo: {
          primario: '#0f0f1a',
          secundario: '#1a1a2e',
          terciario: '#16213e',
          card: '#1f2937',
        },
        // Cores de texto
        texto: {
          primario: '#ffffff',
          secundario: '#9ca3af',
          terciario: '#6b7280',
          invertido: '#1a1a2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};
