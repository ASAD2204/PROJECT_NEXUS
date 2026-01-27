/**
 * StatCard Component
 * 
 * Reusable statistics card component displaying key metrics with optional trends.
 * Features smooth animations and interactive tooltips.
 * 
 * Features:
 * - Animated number counting on mount
 * - Optional trend indicators (up/down arrows with percentages)
 * - Customizable colors and icons
 * - Tooltip support for additional information
 * - Loading skeleton state
 * - Responsive design
 * - Hover effects and smooth transitions
 * 
 * @component
 * @param {Object} props
 * @param {string} props.title - Card title/label
 * @param {string|number} props.value - Main statistic value
 * @param {React.Component} props.icon - Icon component to display
 * @param {string} props.color - Color theme (primary, success, warning, error, info)
 * @param {string} props.trend - Trend direction ('up' or 'down')
 * @param {string|number} props.trendValue - Percentage change value
 * @param {string} props.tooltip - Tooltip text for additional info
 * @param {boolean} props.loading - Loading state
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Tooltip, IconButton } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, InfoOutlined } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';

/**
 * StatCard - Reusable statistics card component with enhanced tooltips
 * 
 * @param {string} title - Card title (e.g., "CGPA")
 * @param {string|number} value - Main value to display (e.g., "3.85")
 * @param {ReactNode} icon - MUI icon component
 * @param {string} color - 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
 * @param {object} trend - Trend object { direction: 'up' | 'down', value: '5%' } (optional)
 * @param {string} subtitle - Additional subtitle text (optional)
 * @param {string} tooltip - Helpful tooltip text explaining the stat (optional)
 * @param {boolean} loading - Shows skeleton loader if true (optional)
 * @param {function} onClick - Click handler for the card (optional)
 */
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  trend,
  subtitle,
  tooltip,
  loading = false,
  onClick,
}) => {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);

  // Simple mount effect without animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // displayValue: central formatting helper used to keep number rendering
  // predictable across various inputs (strings vs numbers).

  // Format the displayed value
  const displayValue = () => {
    if (typeof value === 'number') {
      // Preserve decimal places from original value
      const decimalPlaces = value.toString().split('.')[1]?.length || 0;
      return value.toFixed(decimalPlaces);
    }
    return value;
  };

  // Determine trend color and icon
  const trendColor = trend?.direction === 'up' ? 'success.main' : 'error.main';
  const TrendIcon = trend?.direction === 'up' ? TrendingUpIcon : TrendingDownIcon;

  if (loading) {
    return (
      <Card 
        className="fade-in"
        sx={{ 
          height: '100%',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={48} sx={{ mt: 1 }} />
              {trend && <Skeleton variant="text" width="30%" height={20} sx={{ mt: 1 }} />}
              {subtitle && <Skeleton variant="text" width="70%" height={16} sx={{ mt: 1 }} />}
            </Box>
            <Skeleton variant="circular" width={48} height={48} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96],
      }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.3 },
      }}
      style={{ height: '100%' }}
    >
      <Card 
        onClick={onClick}
        sx={{ 
          height: '100%',
          borderRadius: 4,
          opacity: mounted ? 1 : 0,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.1)' 
            : 'rgba(0,0,0,0.05)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 48px rgba(0,0,0,0.5)'
              : '0 12px 48px rgba(0,0,0,0.12)',
            borderColor: `${color}.main`,
          },
        }}
      >
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
            {/* Title with Tooltip */}
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography 
                variant="body2"
                color="text.secondary"
                sx={{ 
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: 1.5,
                }}
              >
                {title}
              </Typography>
              {tooltip && (
                <Tooltip 
                  title={tooltip} 
                  arrow 
                  placement="top"
                  sx={{
                    '& .MuiTooltip-tooltip': {
                      maxWidth: 300,
                      fontSize: '0.813rem',
                    },
                  }}
                >
                  <InfoOutlined 
                    sx={{ 
                      fontSize: 16, 
                      color: 'text.secondary',
                      cursor: 'help',
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: `${color}.main`,
                      },
                    }} 
                  />
                </Tooltip>
              )}
            </Box>

            {/* Animated Icon */}
            {Icon && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.2,
                  duration: 0.6,
                  ease: [0.43, 0.13, 0.23, 0.96],
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: (theme) => theme.palette[color]?.main || theme.palette.primary.main,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: (theme) => `0 4px 12px ${theme.palette[color]?.main}40`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Icon sx={{ fontSize: 24, color: '#ffffff' }} />
                </Box>
              </motion.div>
            )}
          </Box>

          {/* Value with Count-up Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Typography 
              variant="h3" 
              component="div" 
              fontWeight="bold"
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                lineHeight: 1.2,
                color: 'text.primary',
                mb: 1,
                fontFamily: '"Inter", "Roboto", sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              {displayValue()}
            </Typography>
          </motion.div>

          {/* Trend with Animation */}
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{ mb: subtitle ? 1 : 0 }}
              >
                <TrendIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: trendColor,
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: trendColor,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {trend.value}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Subtitle */}
          {subtitle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.75rem',
                  display: 'block',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </Typography>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;
