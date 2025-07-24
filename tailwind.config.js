/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3B7097',
          medium: '#75BDE0',
          dark: '#A9D09E',
        },
        accent: '#F6E2BC',
        // Special icon colors
        silver: '#C0C0C0',
        gold: '#FFD700',
        heartRed: '#DC2626',
        // Darker, more muted colors for better text contrast
        nightBlue: '#1e3a5f', // Much darker blue for night mode
        dayYellow: '#b8860b', // Darker gold/yellow for day mode
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B7097 0%, #75BDE0 50%, #A9D09E 100%)',
        'gradient-accent': 'linear-gradient(135deg, #F6E2BC 0%, #A9D09E 100%)',
        'gradient-warm': 'linear-gradient(135deg, #75BDE0 0%, #F6E2BC 100%)',
      }
    },
  },
  plugins: [],
};