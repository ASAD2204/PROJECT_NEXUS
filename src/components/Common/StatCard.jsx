import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';

/**
 * StatCard - Reusable statistics card component
 * 
 * @param {string} title - Card title (e.g., "CGPA")
 * @param {string|number} value - Main value to display (e.g., "3.85")
 * @param {ReactNode} icon - MUI icon component
 * @param {string} color - 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @param {object} trend - Trend object { direction: 'up' | 'down', value: '5%' } (optional)
 * @param {string} subtitle - Additional subtitle text (optional)
 * @param {boolean} loading - Shows skeleton loader if true (optional)
 */
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  trend,
  subtitle,
  loading = false,
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Animate value on mount
  useEffect(() => {
    setMounted(true);
    
    // Check if value is a number for animation
    const numericValue = typeof value === 'number' ? value : parseFloat(value);
    
    if (!isNaN(numericValue) && !loading) {
      const duration = 1000; // 1 second
      const steps = 60;
      const increment = numericValue / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setAnimatedValue(Math.min(increment * currentStep, numericValue));
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedValue(numericValue);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else if (!loading) {
      setAnimatedValue(value);
    }
  }, [value, loading]);

  // Format the displayed value
  const displayValue = () => {
    if (typeof value === 'number') {
      // Preserve decimal places from original value
      const decimalPlaces = value.toString().split('.')[1]?.length || 0;
      return animatedValue.toFixed(decimalPlaces);
    }
    return animatedValue;
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
    <Card 
      className="hover-lift fade-in"
      sx={{ 
        height: '100%',
        borderRadius: 3,
        opacity: mounted ? 1 : 0,
        animation: mounted ? 'fadeIn 0.3s ease-in-out' : 'none',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          {/* Left side: Content */}
          <Box sx={{ flexGrow: 1, mr: 2 }}>
            {/* Value */}
            <Typography 
              variant="h4" 
              component="div" 
              fontWeight="bold"
              sx={{ 
                fontSize: '2rem',
                lineHeight: 1.2,
                color: 'text.primary',
                mb: 0.5,
              }}
            >
              {displayValue()}
            </Typography>

            {/* Title */}
            <Typography 
              variant="body2"
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                fontWeight: 500,
                mb: trend || subtitle ? 1 : 0,
              }}
            >
              {title}
            </Typography>

            {/* Trend */}
            {trend && (
              <Box 
                display="flex" 
                alignItems="center" 
                sx={{ 
                  mt: 1,
                  mb: subtitle ? 1 : 0,
                }}
              >
                <TrendIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: trendColor, 
                    mr: 0.5,
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: trendColor,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  {trend.value}
                </Typography>
              </Box>
            )}

            {/* Subtitle */}
            {subtitle && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.75rem',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {/* Right side: Icon */}
          {Icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: `${color}.main`,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${color === 'primary' ? 'rgba(25, 118, 210, 0.3)' : 
                           color === 'secondary' ? 'rgba(0, 121, 107, 0.3)' :
                           color === 'success' ? 'rgba(56, 142, 60, 0.3)' :
                           color === 'warning' ? 'rgba(245, 124, 0, 0.3)' :
                           color === 'error' ? 'rgba(211, 47, 47, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
              }}
            >
              <Icon sx={{ fontSize: 24 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
