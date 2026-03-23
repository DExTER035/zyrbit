/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0F',
        card: '#111114',
        elevated: '#1A1A1E',
        brand: '#00FFFF',
        border: '#1E1E26',
        muted: '#888888',
        'zone-mind': '#00BCD4',
        'zone-body': '#4CAF50',
        'zone-growth': '#FF9800',
        'zone-soul': '#E91E63',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'float': 'float 3s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.7' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
