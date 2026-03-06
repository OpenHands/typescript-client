/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import { heroui } from '@heroui/react';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#c9b974',
        logo: '#cfb755',
        base: '#0d0f11',
        'base-secondary': '#24272e',
        danger: '#e76a5e',
        success: '#a5e75e',
        basic: '#9099ac',
        tertiary: '#454545',
        'tertiary-light': '#b7bdc2',
        content: '#ecedee',
        'content-2': '#f9fbfe',
      },
      spacing: {
        4.5: '1.125rem',
        6.5: '1.625rem',
      },
    },
  },
  plugins: [typography, heroui()],
};
