import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Button,
  Container,
  alpha,
  styled,
} from '@mui/material';
import { 
  Print, 
  Refresh,
  EventNote,
  WorkHistory,
} from '@mui/icons-material';
import PageTransition from '../../components/Common/PageTransition';
import TimetableGrid from '../../components/Timetable/TimetableGrid';
import { schedulerAPI } from '../../api/scheduler';
import { useSnackbar } from '../../contexts/SnackbarContext';

const PremiumCard = styled(Card)(({ theme }) => ({
  borderRadius: '32px',
  background: theme.palette.mode === 'light' 
    ? 'rgba(255, 255, 255, 0.8)' 
    : alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: theme.palette.mode === 'light'
    ? '0 20px 40px rgba(0,0,0,0.05)'
    : '0 20px 40px rgba(0,0,0,0.3)',
  overflow: 'visible',
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '8px 20px',
  textTransform: 'none',
  fontWeight: 700,
  boxShadow: 'none',
  backgroundColor: '#4A148C', // Regal Purple for Teachers
  color: '#fff',
  '&:hover': {
    backgroundColor: '#6A1B9A',
    boxShadow: `0 8px 16px ${alpha('#4A148C', 0.2)}`,
  }
}));

const TeacherTimetable = () => {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();

  const fetchTimetable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await schedulerAPI.getMyTimetable();
      setSlots(res.data);
    } catch (err) {
      setError('Failed to load your teaching schedule. Please try again later.');
      showSnackbar('Schedule load failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageTransition>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WorkHistory sx={{ color: '#4A148C', fontSize: 20 }} />
              <Typography variant="overline" sx={{ fontWeight: 800, color: '#4A148C', letterSpacing: 2 }}>
                Faculty Portal
              </Typography>
            </Stack>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
              Teaching <Box component="span" sx={{ color: '#4A148C' }}>Schedule</Box>
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              Review your assigned classes, lab sessions, and academic commitments for the current semester.
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
            <Tooltip title="Refresh Schedule">
              <IconButton 
                onClick={fetchTimetable} 
                disabled={loading}
                sx={{ 
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: alpha('#4A148C', 0.1), color: '#4A148C' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <ActionButton 
              variant="contained" 
              startIcon={<Print />}
              onClick={handlePrint}
            >
              Print Schedule
            </ActionButton>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 15 }}>
            <CircularProgress size={60} thickness={4} sx={{ color: '#4A148C' }} />
            <Typography variant="h6" sx={{ mt: 3, fontWeight: 600, color: 'text.secondary' }}>
              Loading your itinerary...
            </Typography>
          </Box>
        ) : error ? (
          <Alert 
            severity="error" 
            variant="filled" 
            sx={{ borderRadius: '16px', py: 2, bgcolor: '#C62828' }}
          >
            {error}
          </Alert>
        ) : slots.length === 0 ? (
          <PremiumCard sx={{ textAlign: 'center', py: 12 }}>
             <CardContent>
                <EventNote sx={{ fontSize: 80, color: 'text.disabled', mb: 3, opacity: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>No teaching slots assigned</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                  You currently have no classes or labs assigned to you. If you believe this is an error, please contact the department coordinator.
                </Typography>
                <Button 
                  variant="outlined" 
                  sx={{ mt: 4, borderRadius: '12px', color: '#4A148C', borderColor: '#4A148C' }}
                  onClick={fetchTimetable}
                >
                  Check Again
                </Button>
             </CardContent>
          </PremiumCard>
        ) : (
          <PremiumCard elevation={0}>
            <TimetableGrid slots={slots} role="teacher" />
          </PremiumCard>
        )}
      </Container>
    </PageTransition>
  );
};

export default TeacherTimetable;
