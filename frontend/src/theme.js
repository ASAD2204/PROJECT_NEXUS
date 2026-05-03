import { createTheme } from '@mui/material/styles';

// Function to generate theme based on mode
export const getTheme = (mode) => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#2563EB' : '#60A5FA',
        light: isLight ? '#3B82F6' : '#93C5FD',
        dark: isLight ? '#1E40AF' : '#3B82F6',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? '#475569' : '#94A3B8',
        light: isLight ? '#64748B' : '#CBD5E1',
        dark: isLight ? '#334155' : '#64748B',
        contrastText: '#FFFFFF',
      },
      error: {
        main: isLight ? '#DC2626' : '#F87171',
        light: isLight ? '#EF4444' : '#FCA5A5',
        dark: isLight ? '#B91C1C' : '#EF4444',
      },
      warning: {
        main: isLight ? '#D97706' : '#FBBF24',
        light: isLight ? '#F59E0B' : '#FCD34D',
        dark: isLight ? '#B45309' : '#F59E0B',
      },
      success: {
        main: isLight ? '#059669' : '#34D399',
        light: isLight ? '#10B981' : '#6EE7B7',
        dark: isLight ? '#047857' : '#10B981',
      },
      info: {
        main: isLight ? '#0891B2' : '#22D3EE',
        light: isLight ? '#06B6D4' : '#67E8F9',
        dark: isLight ? '#0E7490' : '#06B6D4',
      },
      background: {
        default: isLight ? '#F8FAFC' : '#0F172A',
        paper: isLight ? '#FFFFFF' : '#1E293B',
      },
      text: {
        primary: isLight ? '#0F172A' : '#F1F5F9',
        secondary: isLight ? '#64748B' : '#94A3B8',
      },
      divider: isLight ? '#E2E8F0' : '#334155',
    },
    typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
  },
  shadows: [
    'none',
    isLight ? '0px 1px 2px rgba(0, 0, 0, 0.05)' : '0px 1px 3px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 1px 3px rgba(0, 0, 0, 0.1)' : '0px 2px 4px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 2px 4px rgba(0, 0, 0, 0.1)' : '0px 4px 6px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 4px 6px rgba(0, 0, 0, 0.1)' : '0px 5px 8px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 6px 8px rgba(0, 0, 0, 0.1)' : '0px 6px 10px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 8px 12px rgba(0, 0, 0, 0.1)' : '0px 8px 12px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 10px 16px rgba(0, 0, 0, 0.1)' : '0px 10px 16px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 1px 2px rgba(0, 0, 0, 0.05)' : '0px 1px 3px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 1px 3px rgba(0, 0, 0, 0.1)' : '0px 2px 4px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 2px 4px rgba(0, 0, 0, 0.1)' : '0px 4px 6px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 4px 6px rgba(0, 0, 0, 0.1)' : '0px 5px 8px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 6px 8px rgba(0, 0, 0, 0.1)' : '0px 6px 10px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 8px 12px rgba(0, 0, 0, 0.1)' : '0px 8px 12px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 10px 16px rgba(0, 0, 0, 0.1)' : '0px 10px 16px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 12px 20px rgba(0, 0, 0, 0.1)' : '0px 12px 20px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 14px 24px rgba(0, 0, 0, 0.1)' : '0px 14px 24px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 16px 28px rgba(0, 0, 0, 0.1)' : '0px 16px 28px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 18px 32px rgba(0, 0, 0, 0.1)' : '0px 18px 32px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 20px 36px rgba(0, 0, 0, 0.1)' : '0px 20px 36px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 22px 40px rgba(0, 0, 0, 0.1)' : '0px 22px 40px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 24px 44px rgba(0, 0, 0, 0.1)' : '0px 24px 44px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 26px 48px rgba(0, 0, 0, 0.1)' : '0px 26px 48px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 28px 52px rgba(0, 0, 0, 0.1)' : '0px 28px 52px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 30px 56px rgba(0, 0, 0, 0.1)' : '0px 30px 56px rgba(0, 0, 0, 0.5)',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: isLight 
            ? '0px 4px 20px rgba(0, 0, 0, 0.04)' 
            : '0px 4px 20px rgba(0, 0, 0, 0.4)',
          backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
          backgroundImage: 'none',
          border: isLight ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid rgba(51, 65, 85, 0.8)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isLight 
              ? '0px 12px 24px rgba(0, 0, 0, 0.08)' 
              : '0px 12px 24px rgba(0, 0, 0, 0.6)',
            borderColor: isLight ? '#2563EB' : '#60A5FA',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 22px',
          fontSize: '0.95rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: ({ ownerState, theme }) => ({
          boxShadow: ownerState.color === 'error' 
            ? (theme.palette.mode === 'light' ? '0 4px 12px rgba(220, 38, 38, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.3)')
            : (theme.palette.mode === 'light' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.3)'),
          backgroundImage: ownerState.color === 'error'
            ? (theme.palette.mode === 'light' 
                ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)'
                : 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)')
            : (theme.palette.mode === 'light' 
                ? 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)'
                : 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)'),
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            boxShadow: ownerState.color === 'error'
              ? (theme.palette.mode === 'light' ? '0 6px 20px rgba(220, 38, 38, 0.3)' : '0 6px 20px rgba(0, 0, 0, 0.4)')
              : (theme.palette.mode === 'light' ? '0 6px 20px rgba(37, 99, 235, 0.3)' : '0 6px 20px rgba(0, 0, 0, 0.4)'),
            backgroundImage: ownerState.color === 'error'
              ? (theme.palette.mode === 'light' 
                  ? 'linear-gradient(135deg, #EF4444 0%, #991B1B 100%)'
                  : 'linear-gradient(135deg, #FCA5A5 0%, #DC2626 100%)')
              : (theme.palette.mode === 'light' 
                  ? 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
                  : 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)'),
          },
        }),
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: isLight ? 'rgba(37, 99, 235, 0.04)' : 'rgba(96, 165, 250, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
            '& fieldset': {
              borderColor: isLight ? '#E2E8F0' : '#334155',
            },
            '&:hover fieldset': {
              borderColor: isLight ? '#CBD5E1' : '#475569',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
          borderRight: isLight ? '1px solid #E2E8F0' : '1px solid #334155',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
          color: isLight ? '#0F172A' : '#F1F5F9',
          boxShadow: isLight ? '0px 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
          borderBottom: isLight ? '1px solid #E2E8F0' : '1px solid #334155',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(96, 165, 250, 0.12)',
            '&:hover': {
              backgroundColor: isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(96, 165, 250, 0.16)',
            },
          },
          '&:hover': {
            backgroundColor: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(241, 245, 249, 0.05)',
          },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: isLight ? undefined : '#334155',
          '&::after': {
            background: isLight
              ? undefined
              : 'linear-gradient(90deg, rgba(51,65,85,0) 0%, rgba(71,85,105,0.6) 50%, rgba(51,65,85,0) 100%)',
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});
};

// Export default light theme for backward compatibility
const theme = getTheme('light');

export default theme;