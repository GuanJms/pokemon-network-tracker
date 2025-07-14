import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: '#FF0000',
          blue: '#0000FF',
          yellow: '#FFD700',
          green: '#00FF00',
          purple: '#800080',
          orange: '#FFA500',
        },
        pixel: {
          blue: '#4da6ff',      // Panel blue
          green: '#3ec97a',     // Panel green
          orange: '#ff7e3e',    // Panel orange
          red: '#e94f4f',       // Panel red
          gray: '#232b38',      // Panel bg
          dark: '#181e28',      // Main bg
          border: '#10151e',    // Border
          yellow: '#ffe066',    // For highlights
        },
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", 'monospace', ...fontFamily.mono],
      },
      borderWidth: {
        pixel: '4px',
      },
      boxShadow: {
        pixel: '0 0 0 4px #10151e',
      },
    },
  },
  plugins: [],
};