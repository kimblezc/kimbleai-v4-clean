/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom breakpoints for precise device targeting
      screens: {
        'xs': '375px',    // iPhone SE
        'sm': '640px',    // Default (tablet)
        'md': '768px',    // iPad
        'lg': '1024px',   // iPad Pro
        'xl': '1280px',   // Desktop
        '2xl': '1536px',  // Large Desktop
      },
      // Safe area inset spacing for notched devices
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Touch target minimum sizes
      minHeight: {
        'touch': '44px',  // iOS minimum touch target
        'touch-android': '48px',  // Android minimum touch target
      },
      minWidth: {
        'touch': '44px',
        'touch-android': '48px',
      },
    },
  },
  plugins: [],
}