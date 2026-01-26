import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, LinearProgress, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { School, MenuBook, People, TrendingUp } from '@mui/icons-material';

const SplashScreen = ({ onComplete }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete(), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  const bgGradient = theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)';

  const primaryColor = theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6';
  const secondaryColor = theme.palette.mode === 'dark' ? '#a78bfa' : '#8b5cf6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgGradient,
          overflow: 'hidden',
        }}
      >
        {/* Animated Background Grid */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.1,
            backgroundImage: theme.palette.mode === 'dark'
              ? 'linear-gradient(rgba(96,165,250,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.3) 1px, transparent 1px)'
              : 'linear-gradient(rgba(59,130,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating Icons */}
        {[School, MenuBook, People, TrendingUp].map((Icon, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 20, 0],
            }}
            transition={{
              duration: 4,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: `${20 + i * 20}%`,
              top: `${15 + (i % 2) * 60}%`,
            }}
          >
            <Icon
              sx={{
                fontSize: { xs: 40, md: 60 },
                color: i % 2 === 0 ? primaryColor : secondaryColor,
              }}
            />
          </motion.div>
        ))}

        <Box
          sx={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            position: 'relative',
            zIndex: 1,
            maxWidth: '90%',
          }}
        >
          {/* Company Logo/Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              duration: 1,
            }}
          >
            <Box
              sx={{
                width: { xs: 80, sm: 100, md: 120 },
                height: { xs: 80, sm: 100, md: 120 },
                borderRadius: '24px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme.palette.mode === 'dark'
                  ? `0 20px 60px ${alpha(primaryColor, 0.4)}`
                  : `0 20px 60px ${alpha(primaryColor, 0.3)}`,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                  animation: 'shine 2s infinite',
                  '@keyframes shine': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                  },
                },
              }}
            >
              <School sx={{ fontSize: { xs: 40, sm: 50, md: 60 }, color: 'white' }} />
            </Box>
          </motion.div>

          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                color: theme.palette.mode === 'dark' ? '#f8fafc' : '#0f172a',
                letterSpacing: '-0.02em',
                mb: 1,
              }}
            >
              Project Nexus
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
                letterSpacing: '0.05em',
                fontWeight: 500,
              }}
            >
               The Unified Campus Management System
            </Typography>
          </motion.div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha('#1e293b', 0.6)
                    : alpha('#cbd5e1', 0.6),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    boxShadow: theme.palette.mode === 'dark'
                      ? `0 0 10px ${alpha(primaryColor, 0.5)}`
                      : `0 0 10px ${alpha(primaryColor, 0.3)}`,
                  },
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Loading... {progress}%
            </Typography>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Smart', 'Secure', 'Efficient'].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 0.5,
                      borderRadius: 10,
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(primaryColor, 0.15)
                        : alpha(primaryColor, 0.1),
                      border: `1px solid ${alpha(primaryColor, 0.3)}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.mode === 'dark' ? '#93c5fd' : primaryColor,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      {text}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;

