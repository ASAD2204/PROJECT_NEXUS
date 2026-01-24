import { createTheme } from '@mui/material/styles';

// Function to generate theme based on mode
export const getTheme = (mode) => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#1976D2' : '#90CAF9',
        light: isLight ? '#42A5F5' : '#BBDEFB',
        dark: isLight ? '#1565C0' : '#64B5F6',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? '#00796B' : '#26A69A',
        light: isLight ? '#26A69A' : '#4DB6AC',
        dark: isLight ? '#004D40' : '#00796B',
        contrastText: '#FFFFFF',
      },
      error: {
        main: isLight ? '#D32F2F' : '#EF5350',
        light: isLight ? '#EF5350' : '#EF5350',
        dark: isLight ? '#C62828' : '#E53935',
      },
      warning: {
        main: isLight ? '#F57C00' : '#FFA726',
        light: isLight ? '#FF9800' : '#FFB74D',
        dark: isLight ? '#E65100' : '#FB8C00',
      },
      success: {
        main: isLight ? '#388E3C' : '#66BB6A',
        light: isLight ? '#4CAF50' : '#81C784',
        dark: isLight ? '#2E7D32' : '#4CAF50',
      },
      info: {
        main: isLight ? '#0288D1' : '#29B6F6',
        light: isLight ? '#03A9F4' : '#4FC3F7',
        dark: isLight ? '#01579B' : '#0288D1',
      },
      background: {
        default: isLight ? '#F4F6F8' : '#121212',
        paper: isLight ? '#FFFFFF' : '#1E1E1E',
      },
      text: {
        primary: isLight ? '#212121' : '#FFFFFF',
        secondary: isLight ? '#757575' : '#B0B0B0',
      },
      divider: isLight ? '#E0E0E0' : '#333333',
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
    isLight ? '0px 2px 4px rgba(0, 0, 0, 0.05)' : '0px 2px 4px rgba(0, 0, 0, 0.3)',
    isLight ? '0px 4px 8px rgba(0, 0, 0, 0.08)' : '0px 4px 8px rgba(0, 0, 0, 0.4)',
    isLight ? '0px 8px 16px rgba(0, 0, 0, 0.1)' : '0px 8px 16px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 12px 24px rgba(0, 0, 0, 0.12)' : '0px 12px 24px rgba(0, 0, 0, 0.6)',
    isLight ? '0px 16px 32px rgba(0, 0, 0, 0.14)' : '0px 16px 32px rgba(0, 0, 0, 0.7)',
    isLight ? '0px 20px 40px rgba(0, 0, 0, 0.16)' : '0px 20px 40px rgba(0, 0, 0, 0.8)',
    isLight ? '0px 24px 48px rgba(0, 0, 0, 0.18)' : '0px 24px 48px rgba(0, 0, 0, 0.9)',
    isLight ? '0px 2px 4px rgba(0, 0, 0, 0.05)' : '0px 2px 4px rgba(0, 0, 0, 0.3)',
    isLight ? '0px 4px 8px rgba(0, 0, 0, 0.08)' : '0px 4px 8px rgba(0, 0, 0, 0.4)',
    isLight ? '0px 8px 16px rgba(0, 0, 0, 0.1)' : '0px 8px 16px rgba(0, 0, 0, 0.5)',
    isLight ? '0px 12px 24px rgba(0, 0, 0, 0.12)' : '0px 12px 24px rgba(0, 0, 0, 0.6)',
    isLight ? '0px 16px 32px rgba(0, 0, 0, 0.14)' : '0px 16px 32px rgba(0, 0, 0, 0.7)',
    isLight ? '0px 20px 40px rgba(0, 0, 0, 0.16)' : '0px 20px 40px rgba(0, 0, 0, 0.8)',
    isLight ? '0px 24px 48px rgba(0, 0, 0, 0.18)' : '0px 24px 48px rgba(0, 0, 0, 0.9)',
    isLight ? '0px 28px 56px rgba(0, 0, 0, 0.2)' : '0px 28px 56px rgba(0, 0, 0, 1)',
    isLight ? '0px 32px 64px rgba(0, 0, 0, 0.22)' : '0px 32px 64px rgba(0, 0, 0, 1)',
    isLight ? '0px 36px 72px rgba(0, 0, 0, 0.24)' : '0px 36px 72px rgba(0, 0, 0, 1)',
    isLight ? '0px 40px 80px rgba(0, 0, 0, 0.26)' : '0px 40px 80px rgba(0, 0, 0, 1)',
    isLight ? '0px 44px 88px rgba(0, 0, 0, 0.28)' : '0px 44px 88px rgba(0, 0, 0, 1)',
    isLight ? '0px 48px 96px rgba(0, 0, 0, 0.3)' : '0px 48px 96px rgba(0, 0, 0, 1)',
    isLight ? '0px 52px 104px rgba(0, 0, 0, 0.32)' : '0px 52px 104px rgba(0, 0, 0, 1)',
    isLight ? '0px 56px 112px rgba(0, 0, 0, 0.34)' : '0px 56px 112px rgba(0, 0, 0, 1)',
    isLight ? '0px 60px 120px rgba(0, 0, 0, 0.36)' : '0px 60px 120px rgba(0, 0, 0, 1)',
    isLight ? '0px 64px 128px rgba(0, 0, 0, 0.38)' : '0px 64px 128px rgba(0, 0, 0, 1)',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: isLight ? '0px 4px 20px rgba(0, 0, 0, 0.05)' : '0px 2px 8px rgba(0, 0, 0, 0.4)',
          backgroundColor: isLight ? '#FFFFFF' : '#1E1E1E',
          backgroundImage: isLight ? 'none' : 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
          border: isLight ? '1px solid transparent' : '1px solid #333333',
          transition: 'box-shadow 0.2s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 20px',
        },
        contained: {
          boxShadow: isLight ? '0px 2px 4px rgba(0, 0, 0, 0.1)' : '0px 2px 8px rgba(33, 150, 243, 0.3)',
          '&:hover': {
            boxShadow: isLight ? '0px 4px 8px rgba(0, 0, 0, 0.15)' : '0px 4px 12px rgba(33, 150, 243, 0.4)',
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
          borderRadius: '12px',
          backgroundColor: isLight ? '#FFFFFF' : '#1E1E1E',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            backgroundColor: isLight ? '#FFFFFF' : '#1E1E1E',
            '& fieldset': {
              borderColor: isLight ? 'rgba(0, 0, 0, 0.23)' : '#333333',
            },
            '&:hover fieldset': {
              borderColor: isLight ? 'rgba(0, 0, 0, 0.4)' : '#444444',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: isLight ? '#FFFFFF' : '#1E1E1E',
          borderRight: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid #333333',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: isLight ? '#FFFFFF' : '#1E1E1E',
          color: isLight ? '#212121' : '#FFFFFF',
          boxShadow: isLight ? '0px 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: isLight ? 'rgba(25, 118, 210, 0.08)' : 'rgba(33, 150, 243, 0.16)',
            '&:hover': {
              backgroundColor: isLight ? 'rgba(25, 118, 210, 0.12)' : 'rgba(33, 150, 243, 0.24)',
            },
          },
          '&:hover': {
            backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: isLight ? undefined : '#333333',
          '&::after': {
            background: isLight
              ? undefined
              : 'linear-gradient(90deg, rgba(51,51,51,0) 0%, rgba(68,68,68,0.6) 50%, rgba(51,51,51,0) 100%)',
          },
        },
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
});
};

// Export default light theme for backward compatibility
const theme = getTheme('light');

export default theme;