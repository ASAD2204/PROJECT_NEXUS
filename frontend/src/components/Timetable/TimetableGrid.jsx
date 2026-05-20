import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tooltip,
  useTheme,
  alpha,
  styled,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import { 
  AccessTime, 
  LocationOn, 
  Person, 
  School,
  CalendarViewWeek,
  CalendarViewDay,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

const GridContainer = styled(Box)(({ theme }) => ({
  minWidth: 1100,
  padding: theme.spacing(3),
  background: theme.palette.mode === 'light' 
    ? 'rgba(255, 255, 255, 0.4)' 
    : 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(20px)',
  borderRadius: '24px',
}));

const DayHeader = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  background: theme.palette.mode === 'light'
    ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '16px',
  marginBottom: theme.spacing(2),
  boxShadow: 'none',
  minHeight: 80,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  '& .MuiTypography-root': {
    fontWeight: 800,
    color: theme.palette.text.primary,
    fontSize: '0.9rem',
    letterSpacing: '0.05rem',
  }
}));

const TimeLabel = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 700,
  color: theme.palette.text.secondary,
  textAlign: 'right',
  paddingRight: theme.spacing(2),
}));

const SlotPaper = styled(Paper)(({ theme }) => ({
  minHeight: 125,
  padding: theme.spacing(0.5),
  background: alpha(theme.palette.divider, 0.05),
  border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  '&:hover': {
    background: alpha(theme.palette.divider, 0.1),
  }
}));

const ClassCard = styled(motion.div)(({ theme, rolecolor }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '16px',
  color: '#fff',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  minHeight: 110,
  background: `linear-gradient(135deg, ${rolecolor} 0%, ${alpha(rolecolor, 0.8)} 100%)`,
  boxShadow: `0 8px 20px ${alpha(rolecolor, 0.3)}`,
  border: `1px solid ${alpha('#fff', 0.2)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)',
    transform: 'rotate(45deg)',
    pointerEvents: 'none',
  },
  '&:hover': {
    boxShadow: `0 12px 28px ${alpha(rolecolor, 0.4)}`,
  }
}));

const TimetableGrid = ({ slots, role = 'student' }) => {
  const theme = useTheme();

  // Role-consistent deep colors: Sapphire for Students, Regal Purple for Teachers
  const roleColor = role === 'student' ? '#1A237E' : '#4A148C';

  // --- Dynamic Date Calculation ---
  const { weekDates, todayName } = useMemo(() => {
    const dates = {};
    const today = new Date();
    const currentDayIdx = today.getDay(); // 0 is Sunday, 1 is Monday
    
    // Find Monday of current week
    const diffToMonday = currentDayIdx === 0 ? -6 : 1 - currentDayIdx;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    DAYS.forEach((day, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      dates[day] = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    });

    return { 
      weekDates: dates, 
      todayName: today.toLocaleDateString('en-US', { weekday: 'long' }) 
    };
  }, []);

  const [filterDay, setFilterDay] = useState('All');

  const formattedSlots = useMemo(() => {
    const grid = {};
    DAYS.forEach(day => { grid[day] = {}; });

    slots.forEach(slot => {
      if (grid[slot.day_of_week]) {
        const hour = parseInt(slot.start_time.split(':')[0]);
        if (!grid[slot.day_of_week][hour]) {
          grid[slot.day_of_week][hour] = [];
        }
        grid[slot.day_of_week][hour].push(slot);
      }
    });
    return grid;
  }, [slots]);

  const activeDays = filterDay === 'All' ? DAYS : [filterDay];
  const gridWidth = filterDay === 'All' ? 1100 : 600;

  return (
    <Box sx={{ p: 1 }}>
      {/* Day Selector Navigation */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 0.5, 
            borderRadius: '20px', 
            bgcolor: alpha(roleColor, 0.05),
            border: '1px solid',
            borderColor: alpha(roleColor, 0.1),
            display: 'inline-flex'
          }}
        >
          <ToggleButtonGroup
            value={filterDay}
            exclusive
            onChange={(e, next) => next && setFilterDay(next)}
            aria-label="day selector"
            sx={{
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '16px',
                px: 2.5,
                py: 1,
                fontWeight: 800,
                fontSize: '0.75rem',
                color: 'text.secondary',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                  bgcolor: roleColor,
                  color: 'white',
                  boxShadow: `0 4px 12px ${alpha(roleColor, 0.4)}`,
                  '&:hover': { bgcolor: roleColor }
                },
                '&:hover': {
                  bgcolor: alpha(roleColor, 0.1)
                }
              }
            }}
          >
            <ToggleButton value="All">
              <CalendarViewWeek sx={{ mr: 1, fontSize: 18 }} /> WEEK VIEW
            </ToggleButton>
            {DAYS.map(day => (
              <ToggleButton key={day} value={day}>
                {day.slice(0, 3).toUpperCase()}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Paper>
      </Box>

      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <GridContainer sx={{ minWidth: gridWidth, transition: 'min-width 0.5s ease' }}>
          <Grid container spacing={2}>
            {/* Header Row */}
            <Grid item xs={0.8} />
            {activeDays.map(day => {
              const isToday = day === todayName;
              return (
                <Grid item xs key={day}>
                  <DayHeader 
                    elevation={0}
                    sx={{
                      ...(isToday && {
                        border: `2px solid ${roleColor}`,
                        background: theme.palette.mode === 'light' 
                          ? alpha(roleColor, 0.05) 
                          : alpha(roleColor, 0.2),
                        transform: 'scale(1.02)',
                        zIndex: 2,
                      })
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{day}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800, display: 'block' }}>
                      {weekDates[day]}
                    </Typography>
                    {isToday && (
                      <Chip 
                        label="TODAY" 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '0.6rem', 
                          fontWeight: 900, 
                          bgcolor: roleColor, 
                          color: 'white',
                          mt: 1,
                          boxShadow: `0 4px 10px ${alpha(roleColor, 0.4)}`
                        }} 
                      />
                    )}
                  </DayHeader>
                </Grid>
              );
            })}

            {/* Time Rows */}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <Grid item xs={0.8} sx={{ display: 'flex', alignItems: 'flex-start', pt: 2 }}>
                  <TimeLabel>
                    {hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`}
                  </TimeLabel>
                </Grid>
                {activeDays.map(day => (
                  <Grid item xs key={`${day}-${hour}`}>
                    <SlotPaper elevation={0}>
                      <AnimatePresence mode='popLayout'>
                        {formattedSlots[day][hour]?.map((slot, idx) => (
                          <Tooltip 
                            key={slot.id || idx}
                            arrow
                            title={
                              <Box sx={{ p: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{slot.course_title}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 14 }} />
                                  <Typography variant="caption">{slot.start_time} - {slot.end_time}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14 }} />
                                  <Typography variant="caption">{slot.room_no}</Typography>
                                </Box>
                              </Box>
                            }
                          >
                            <ClassCard
                              layout
                              rolecolor={roleColor}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              whileHover={{ 
                                scale: 1.05, 
                                y: -5,
                                transition: { type: "spring", stiffness: 300 }
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Box>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 900, 
                                    letterSpacing: 1, 
                                    opacity: 0.9,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                  }}
                                >
                                  <School sx={{ fontSize: 14 }} />
                                  {slot.course_code}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    lineHeight: 1.2, 
                                    mt: 0.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {slot.course_title}
                                </Typography>
                              </Box>

                              <Stack spacing={0.5}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.8 }}>
                                  <LocationOn sx={{ fontSize: 12 }} />
                                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                                    {slot.room_no}
                                  </Typography>
                                </Box>
                                {slot.instructor_name && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.8 }}>
                                    <Person sx={{ fontSize: 12 }} />
                                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600 }} noWrap>
                                      {slot.instructor_name}
                                    </Typography>
                                  </Box>
                                )}
                              </Stack>
                            </ClassCard>
                          </Tooltip>
                        ))}
                      </AnimatePresence>
                    </SlotPaper>
                  </Grid>
                ))}
              </React.Fragment>
            ))}
          </Grid>
        </GridContainer>
      </Box>
    </Box>
  );
};

export default TimetableGrid;
