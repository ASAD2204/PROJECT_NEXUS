import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const SplashScreen = ({ onComplete }) => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete(), 800);
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
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
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 25%, #7e22ce 50%, #2a5298 75%, #1e3c72 100%)'
            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 25%, #667eea 50%, #00f2fe 75%, #4facfe 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Animated Background Circles */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 1],
                opacity: [0, 0.3, 0],
                x: ['-50%', `${(i - 3) * 15}%`],
                y: ['-50%', `${(i - 3) * 10}%`],
              }}
              transition={{
                duration: 4,
                delay: i * 0.3,
                repeat: Infinity,
                repeatType: 'loop',
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${300 + i * 50}px`,
                height: `${300 + i * 50}px`,
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.2)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Animated Logo/Text */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: -180 }}
            animate={{ 
              scale: [0.3, 1.1, 1], 
              opacity: 1, 
              rotateY: 0,
            }}
            transition={{
              duration: 1.5,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
          >
            <Box sx={{ position: 'relative' }}>
              {/* Glow effect behind text */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '120%',
                  height: '120%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  animation: 'pulse 3s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      opacity: 0.5,
                      transform: 'translate(-50%, -50%) scale(1)',
                    },
                    '50%': {
                      opacity: 1,
                      transform: 'translate(-50%, -50%) scale(1.1)',
                    },
                  },
                }}
              />
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '3.5rem', sm: '5rem', md: '6.5rem' },
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #ffffff 0%, #e3f2fd 50%, #ffffff 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 60px rgba(255,255,255,0.5)',
                  letterSpacing: '0.05em',
                  fontFamily: '"Rajdhani", "Roboto", sans-serif',
                  position: 'relative',
                }}
              >
                Project Nexus
              </Typography>
            </Box>
          </motion.div>

          {/* Animated Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 400,
                letterSpacing: '0.25em',
                fontSize: { xs: '0.7rem', sm: '0.85rem', md: '1rem' },
                textTransform: 'uppercase',
              }}
            >
              The Unified Campus Management System
            </Typography>
          </motion.div>

          {/* Animated Floating Elements */}
          <Box sx={{ position: 'relative', width: '100%', height: 80 }}>
            {[...Array(7)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.2, 1, 1.2, 0],
                  opacity: [0, 0.8, 1, 0.8, 0],
                  x: [(i - 3) * 60, (i - 3) * 80, (i - 3) * 100],
                }}
                transition={{
                  duration: 3.5,
                  delay: 1.2 + i * 0.15,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 0 25px rgba(255,255,255,0.8)',
                }}
              />
            ))}
          </Box>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.25)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.8) 100%)',
                  boxShadow: '0 0 15px rgba(255,255,255,0.6)',
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                mt: 2,
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
              }}
            >
              Loading {progress}%
            </Typography>
          </motion.div>

          {/* Outer Rings */}
          {[1, 2, 3].map((ring) => (
            <Box
              key={ring}
              sx={{
                position: 'absolute',
                width: { xs: 300 + ring * 80, sm: 400 + ring * 100, md: 500 + ring * 120 },
                height: { xs: 300 + ring * 80, sm: 400 + ring * 100, md: 500 + ring * 120 },
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.1)',
                animation: `pulse-ring-${ring} ${3 + ring}s ease-in-out infinite`,
                '@keyframes pulse-ring-1': {
                  '0%, 100%': {
                    transform: 'scale(0.95)',
                    opacity: 0.3,
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    opacity: 0.15,
                  },
                },
                '@keyframes pulse-ring-2': {
                  '0%, 100%': {
                    transform: 'scale(0.9)',
                    opacity: 0.25,
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                    opacity: 0.1,
                  },
                },
                '@keyframes pulse-ring-3': {
                  '0%, 100%': {
                    transform: 'scale(0.85)',
                    opacity: 0.2,
                  },
                  '50%': {
                    transform: 'scale(1.15)',
                    opacity: 0.05,
                  },
                },
              }}
            />
          ))}
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;

