/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // ---------------------------------------------------------------
      // COLORS — Refined palette inspired by Linear, Vercel, Stripe
      // ---------------------------------------------------------------
      colors: {
        bear: {
          50:  '#F0EEFF',
          100: '#DDD8FF',
          200: '#C4BAFF',
          300: '#A494FF',
          400: '#8A76F0',
          500: '#6C5CE7',
          600: '#5B4BD5',
          700: '#4A3BB8',
          800: '#3A2E96',
          900: '#2B2173',
          950: '#1A0E4B',
        },
        accent: {
          50:  '#E8FDFD',
          100: '#C5FAFA',
          200: '#8DF5F6',
          300: '#4EEAEB',
          400: '#1CDEDE',
          500: '#00D2D3',
          600: '#0ABDE3',
          700: '#0899B8',
          800: '#0A748D',
          900: '#0C5B6F',
          950: '#043C3E',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          subtle:  'var(--border-subtle)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          inverse:   'var(--text-inverse)',
        },
        status: {
          success:       '#00B894',
          'success-bg':  '#E6F9F3',
          'success-ring': '#00B89433',
          warning:       '#F6B93B',
          'warning-bg':  '#FEF7E6',
          'warning-ring': '#F6B93B33',
          error:         '#EE5A24',
          'error-bg':    '#FEF0EB',
          'error-ring':  '#EE5A2433',
          info:          '#0984E3',
          'info-bg':     '#EBF5FF',
          'info-ring':   '#0984E333',
        },
      },

      // ---------------------------------------------------------------
      // TYPOGRAPHY — Inter (body), Plus Jakarta Sans (display), JetBrains Mono (code)
      // ---------------------------------------------------------------
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.04em' }],
        '3xs': ['0.5rem',   { lineHeight: '0.75rem',  letterSpacing: '0.05em' }],
      },
      letterSpacing: {
        'micro': '0.02em',
      },

      // ---------------------------------------------------------------
      // SPACING — Granular scale for pixel-perfect layouts
      // ---------------------------------------------------------------
      spacing: {
        '0.75': '0.1875rem',   // 3px
        '1.25': '0.3125rem',   // 5px
        '1.75': '0.4375rem',   // 7px
        '2.25': '0.5625rem',   // 9px
        '2.75': '0.6875rem',   // 11px
        '3.25': '0.8125rem',   // 13px
        '3.75': '0.9375rem',   // 15px
        '4.5':  '1.125rem',    // 18px
        '5.5':  '1.375rem',    // 22px
        '6.5':  '1.625rem',    // 26px
        '7.5':  '1.875rem',    // 30px
        '13':   '3.25rem',
        '15':   '3.75rem',
        '17':   '4.25rem',
        '18':   '4.5rem',
        '22':   '5.5rem',
        '26':   '6.5rem',
        '30':   '7.5rem',
        '34':   '8.5rem',
        '68':   '17rem',
        '76':   '19rem',
        '84':   '21rem',
        '88':   '22rem',
        '92':   '23rem',
        '100':  '25rem',
        '120':  '30rem',
      },

      // ---------------------------------------------------------------
      // BORDER RADIUS — Complete scale from subtle to pill
      // ---------------------------------------------------------------
      borderRadius: {
        'xs':   '0.125rem',  // 2px  — barely rounded
        'sm2':  '0.1875rem', // 3px  — between sm and default
        '4xl':  '2rem',      // 32px
        '5xl':  '2.5rem',    // 40px
        'pill': '9999px',
      },

      // ---------------------------------------------------------------
      // BOX SHADOWS — Layered depth system + colored glows
      // ---------------------------------------------------------------
      boxShadow: {
        // Neutral depth layers (Linear-style)
        'xs':          '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'soft':        '0 2px 8px -2px rgb(0 0 0 / 0.08)',
        'medium':      '0 4px 16px -4px rgb(0 0 0 / 0.1)',
        'large':       '0 8px 32px -8px rgb(0 0 0 / 0.12)',
        'xl':          '0 12px 48px -12px rgb(0 0 0 / 0.15)',
        '2xl':         '0 24px 64px -16px rgb(0 0 0 / 0.2)',

        // Card system (Stripe-style layered)
        'card':        '0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.06)',
        'card-hover':  '0 10px 40px -12px rgb(0 0 0 / 0.12)',
        'card-active': '0 2px 8px rgb(0 0 0 / 0.06), 0 0 0 2px rgb(108 92 231 / 0.15)',

        // Colored glows (primary)
        'glow':         '0 0 20px rgb(108 92 231 / 0.15)',
        'glow-sm':      '0 0 10px rgb(108 92 231 / 0.12)',
        'glow-lg':      '0 0 40px rgb(108 92 231 / 0.2)',
        'glow-ring':    '0 0 0 3px rgb(108 92 231 / 0.1), 0 0 20px rgb(108 92 231 / 0.12)',

        // Colored glows (accent)
        'glow-accent':     '0 0 20px rgb(0 210 211 / 0.15)',
        'glow-accent-sm':  '0 0 10px rgb(0 210 211 / 0.12)',
        'glow-accent-lg':  '0 0 40px rgb(0 210 211 / 0.2)',
        'glow-accent-ring':'0 0 0 3px rgb(0 210 211 / 0.1), 0 0 20px rgb(0 210 211 / 0.12)',

        // Status glows
        'glow-success': '0 0 16px rgb(0 184 148 / 0.2)',
        'glow-error':   '0 0 16px rgb(238 90 36 / 0.2)',
        'glow-warning': '0 0 16px rgb(246 185 59 / 0.2)',
        'glow-info':    '0 0 16px rgb(9 132 227 / 0.2)',

        // Inner / inset
        'inner-glow':   'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
        'inner-shadow': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'inner-ring':   'inset 0 0 0 1px rgb(0 0 0 / 0.05)',

        // Layout
        'sidebar':      '4px 0 24px -4px rgb(0 0 0 / 0.08)',
        'topbar':       '0 1px 0 0 rgb(0 0 0 / 0.05)',
        'dropdown':     '0 4px 24px -4px rgb(0 0 0 / 0.12), 0 0 0 1px rgb(0 0 0 / 0.05)',
        'modal':        '0 16px 70px -12px rgb(0 0 0 / 0.25)',
        'tooltip':      '0 4px 12px -2px rgb(0 0 0 / 0.15)',

        // Focus ring (Vercel-style)
        'focus-ring':   '0 0 0 2px var(--surface-0), 0 0 0 4px rgb(108 92 231 / 0.5)',
      },

      // ---------------------------------------------------------------
      // BACKDROP BLUR — Fine-grained glassmorphism control
      // ---------------------------------------------------------------
      backdropBlur: {
        xs:   '2px',
        '2xs': '1px',
        '4xl': '72px',
        '5xl': '96px',
      },

      // ---------------------------------------------------------------
      // ANIMATIONS — Spring-like easing, richer motion library
      // ---------------------------------------------------------------
      animation: {
        // Fades
        'fade-in':        'fadeIn 0.3s ease-out',
        'fade-in-up':     'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down':   'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-out':       'fadeOut 0.2s ease-in',

        // Slides
        'slide-in-left':  'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':       'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down':     'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',

        // Scale
        'scale-in':       'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-up':       'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Looping
        'shimmer':        'shimmer 2s infinite linear',
        'pulse-soft':     'pulseSoft 2s infinite ease-in-out',
        'spin-slow':      'spin 3s linear infinite',
        'ping-slow':      'pingSlow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'wiggle':         'wiggle 0.5s ease-in-out',
        'float':          'float 6s ease-in-out infinite',
        'gradient':       'gradient 8s ease infinite',

        // Spring / bouncy
        'bounce-in':      'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-out':     'bounceOut 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Utility
        'counter':        'counter 1.5s ease-out forwards',
        'skeleton':       'skeleton 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleUp: {
          '0%':   { opacity: '0', transform: 'scale(0.85)' },
          '60%':  { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        pingSlow: {
          '0%':       { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%':      { transform: 'rotate(-3deg)' },
          '50%':      { transform: 'rotate(3deg)' },
          '75%':      { transform: 'rotate(-1deg)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceOut: {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '50%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(0.85)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        skeleton: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },

      // ---------------------------------------------------------------
      // TRANSITIONS — Spring-like and smooth easing functions
      // ---------------------------------------------------------------
      transitionTimingFunction: {
        'bounce':   'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth':   'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo':  'cubic-bezier(0.7, 0, 0.84, 0)',
        'snap':     'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        '50':  '50ms',
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '2000': '2000ms',
      },

      // ---------------------------------------------------------------
      // CONTAINER QUERIES — @container support
      // ---------------------------------------------------------------
      containers: {
        'xs':  '20rem',   // 320px
        'sm':  '24rem',   // 384px
        'md':  '28rem',   // 448px
        'lg':  '32rem',   // 512px
        'xl':  '36rem',   // 576px
        '2xl': '42rem',   // 672px
        '3xl': '48rem',   // 768px
        '4xl': '56rem',   // 896px
        '5xl': '64rem',   // 1024px
      },

      // ---------------------------------------------------------------
      // Z-INDEX — Named layers for consistent stacking
      // ---------------------------------------------------------------
      zIndex: {
        'behind':   '-1',
        'dropdown': '1000',
        'sticky':   '1100',
        'overlay':  '1200',
        'modal':    '1300',
        'popover':  '1400',
        'toast':    '1500',
        'tooltip':  '1600',
        'max':      '9999',
      },

      // ---------------------------------------------------------------
      // MIN/MAX WIDTH — Useful breakpoints for responsive components
      // ---------------------------------------------------------------
      minWidth: {
        'prose': '65ch',
      },
      maxWidth: {
        'prose-narrow': '45ch',
        'prose':        '65ch',
        'prose-wide':   '80ch',
        '8xl':          '90rem',
        '9xl':          '100rem',
      },

      // ---------------------------------------------------------------
      // OPACITY — Fine-grained control
      // ---------------------------------------------------------------
      opacity: {
        '2.5': '0.025',
        '3':   '0.03',
        '4':   '0.04',
        '7.5': '0.075',
        '8':   '0.08',
        '12':  '0.12',
        '15':  '0.15',
        '35':  '0.35',
        '45':  '0.45',
        '55':  '0.55',
        '65':  '0.65',
        '85':  '0.85',
      },
    },
  },
  plugins: [
    // Container queries plugin (if installed)
    ...(function() {
      try {
        return [require('@tailwindcss/container-queries')];
      } catch (_) {
        return [];
      }
    })(),
  ],
};
