/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A6B5F',
          light: '#5D8A7D',
          dark: '#3A554B',
        },
        secondary: '#F5F0E6',
        accent: {
          DEFAULT: '#D4A373',
          light: '#E6B88A',
          dark: '#C08D5C',
        },
        danger: '#E56B6F',
        success: '#6A9C89',
        text: '#333333',
        'text-light': '#666666',
        background: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
