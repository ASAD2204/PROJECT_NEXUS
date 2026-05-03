import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const globalStyles = (theme) => ({
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 1,
    },
  },
  '@keyframes slideUp': {
    from: {
      transform: 'translateY(20px)',
      opacity: 0,
    },
    to: {
      transform: 'translateY(0)',
      opacity: 1,
    },
  },
  '@keyframes scaleIn': {
    from: {
      transform: 'scale(0.95)',
      opacity: 0,
    },
    to: {
      transform: 'scale(1)',
      opacity: 1,
    },
  },
  '@keyframes shimmer': {
    '0%': {
      backgroundPosition: '-1000px 0',
    },
    '100%': {
      backgroundPosition: '1000px 0',
    },
  },
  '*': {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  },
  'html, body': {
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
  },
  body: {
    fontFamily: theme.typography.fontFamily,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '#root': {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  // Custom scrollbar styling
  '::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '::-webkit-scrollbar-track': {
    background: theme.palette.background.default,
  },
  '::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark' ? '#333333' : theme.palette.grey[400],
    borderRadius: '4px',
    '&:hover': {
      background: theme.palette.mode === 'dark' ? '#444444' : theme.palette.grey[500],
    },
  },
  // Page container
  '.page-container': {
    padding: '16px',
    minHeight: 'calc(100vh - 64px)',
    animation: 'fadeIn 0.3s ease-in-out',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    margin: 0,
    '@media (min-width: 600px)': {
      padding: '20px',
    },
    '@media (min-width: 900px)': {
      padding: '24px',
    },
    '@media (min-width: 1200px)': {
      padding: '24px 28px',
    },
    '@media (min-width: 1536px)': {
      padding: '28px 32px',
    },
  },
  // Glass morphism effect
  '.glass-morphism': {
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
  },
  // Gradient background
  '.gradient-bg': {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  },
  // Hover lift effect
  '.hover-lift': {
    transition: 'none',
    cursor: 'default',
  },
  // Status dots
  '.status-dot': {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
    '&.online': {
      backgroundColor: theme.palette.success.main,
      boxShadow: `0 0 0 2px ${theme.palette.success.light}40`,
    },
    '&.offline': {
      backgroundColor: theme.palette.grey[400],
    },
    '&.away': {
      backgroundColor: theme.palette.warning.main,
      boxShadow: `0 0 0 2px ${theme.palette.warning.light}40`,
    },
    '&.busy': {
      backgroundColor: theme.palette.error.main,
      boxShadow: `0 0 0 2px ${theme.palette.error.light}40`,
    },
  },
  // Animation classes
  '.fade-in': {
    animation: 'fadeIn 0.3s ease-in-out',
  },
  '.slide-up': {
    animation: 'slideUp 0.4s ease-out',
  },
  '.scale-in': {
    animation: 'scaleIn 0.2s ease-out',
  },
  '.shimmer': {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(to right, #333333 0%, #444444 20%, #333333 40%, #333333 100%)'
      : `linear-gradient(to right, ${theme.palette.grey[200]} 0%, ${theme.palette.grey[300]} 20%, ${theme.palette.grey[200]} 40%, ${theme.palette.grey[200]} 100%)`,
    backgroundSize: '1000px 100%',
    animation: 'shimmer 2s infinite linear',
  },
  // Loading skeleton
  '.skeleton': {
    backgroundColor: theme.palette.mode === 'dark' ? '#333333' : theme.palette.grey[200],
    borderRadius: theme.shape.borderRadius,
    '&.shimmer': {
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(to right, #333333 0%, #444444 20%, #333333 40%, #333333 100%)'
        : `linear-gradient(to right, ${theme.palette.grey[200]} 0%, ${theme.palette.grey[300]} 20%, ${theme.palette.grey[200]} 40%, ${theme.palette.grey[200]} 100%)`,
      backgroundSize: '1000px 100%',
      animation: 'shimmer 2s infinite linear',
    },
  },
  // Recharts styling
  '.recharts-cartesian-grid line': {
    stroke: theme.palette.mode === 'dark' ? '#444444' : '#E0E0E0',
  },
  '.recharts-default-tooltip': {
    backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#FFFFFF',
    border: `1px solid ${theme.palette.mode === 'dark' ? '#444444' : '#E0E0E0'}`,
    color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#212121',
  },
  // Utility classes
  '.smooth-transition': {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '.text-gradient': {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  '.card-hover': {
    transition: 'none',
  },
  // Focus visible styles
  '.focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  // Hide scrollbar but keep functionality
  '.scrollbar-hidden': {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

export default globalStyles;