import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  LinearProgress,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment,
  CheckCircle,
  PendingActions,
  Warning,
  CalendarToday,
  Grade,
  ArrowForward,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { assignments as assignmentsData, courses } from '../../data/dummyData';

const MyAssignments = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Get assignments from dummyData with course info
  const [assignments] = useState(
    assignmentsData.map((assignment) => {
      const course = courses.find((c) => c.id === assignment.courseId);
      return {
        id: assignment.id,
        title: assignment.title,
        course: course?.title || 'Unknown Course',
        courseCode: course?.code || 'N/A',
        dueDate: assignment.dueDate,
        submittedDate: assignment.submittedOn,
        status: assignment.status.toLowerCase(),
        totalMarks: assignment.totalMarks,
        obtainedMarks: assignment.obtainedMarks,
        description: assignment.description,
      };
    })
  );

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
    graded: assignments.filter(a => a.status === 'graded').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'submitted': return 'info';
      case 'graded': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <PendingActions />;
      case 'overdue': return <Warning />;
      case 'submitted': return <CheckCircle />;
      case 'graded': return <Grade />;
      default: return <Assignment />;
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={Assignment}
        title="My Assignments"
        subtitle="Track and submit your course assignments"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />

      {/* STATS CARDS */}
      <Grid 
        container 
        spacing={3} 
        sx={{ mb: 4 }}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Total"
            value={stats.total}
            icon={Assignment}
            color="primary"
            tooltip="Total number of assignments across all your courses this semester."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={PendingActions}
            color="warning"
            tooltip="Assignments that are not yet submitted. Submit before the deadline to avoid penalties."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Submitted"
            value={stats.submitted}
            icon={CheckCircle}
            color="info"
            tooltip="Assignments you have submitted and are awaiting grading by your instructors."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Graded"
            value={stats.graded}
            icon={Grade}
            color="success"
            tooltip="Assignments that have been graded. Check your marks and feedback below."
          />
        </Grid>
      </Grid>

      {/* ASSIGNMENTS LIST */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          All Assignments
        </Typography>
        
        <Grid container spacing={3}>
          {assignments.map((assignment) => {
            const daysRemaining = getDaysRemaining(assignment.dueDate);
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={assignment.id} component={motion.div} variants={fadeInUp}>
                <Card
                  sx={{
                    height: '100%',
                    minHeight: 340,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(102,126,234,0.15)' 
                      : 'rgba(102,126,234,0.12)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 8px 24px rgba(0,0,0,0.3)'
                      : '0 8px 24px rgba(102,126,234,0.12)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 12px 32px rgba(0,0,0,0.4)'
                        : '0 12px 32px rgba(102,126,234,0.2)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {assignment.title}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Chip 
                            label={assignment.courseCode} 
                            size="small" 
                            sx={{ fontWeight: 600 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {assignment.course}
                          </Typography>
                        </Stack>
                      </Box>
                      <Chip
                        icon={getStatusIcon(assignment.status)}
                        label={assignment.status.toUpperCase()}
                        color={getStatusColor(assignment.status)}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Stack>

                    {/* Description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {assignment.description}
                    </Typography>

                    {/* Due Date */}
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </Typography>
                      {assignment.status === 'pending' && daysRemaining >= 0 && (
                        <Chip 
                          label={`${daysRemaining} days left`} 
                          size="small" 
                          color={daysRemaining < 3 ? 'error' : 'warning'}
                        />
                      )}
                    </Stack>

                    {/* Graded Info */}
                    {assignment.status === 'graded' && (
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Score: {assignment.obtainedMarks}/{assignment.totalMarks}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {Math.round((assignment.obtainedMarks / assignment.totalMarks) * 100)}%
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={(assignment.obtainedMarks / assignment.totalMarks) * 100}
                          sx={{ 
                            height: 8, 
                            borderRadius: 1,
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          }}
                        />
                      </Box>
                    )}

                    {/* Action Button */}
                    <Button
                      variant={assignment.status === 'pending' || assignment.status === 'overdue' ? 'contained' : 'outlined'}
                      fullWidth
                      endIcon={<ArrowForward />}
                      onClick={() => {
                        if (assignment.status === 'pending' || assignment.status === 'overdue') {
                          navigate(`/lms/assignment/${assignment.id}`);
                        } else if (assignment.status === 'submitted') {
                          navigate(`/lms/assignment/${assignment.id}`);
                        } else {
                          navigate(`/lms/assignment/${assignment.id}`);
                        }
                      }}
                      sx={{
                        py: 1.2,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        ...(assignment.status === 'pending' || assignment.status === 'overdue' ? {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #654391 100%)',
                          },
                        } : {}),
                      }}
                    >
                      {assignment.status === 'pending' || assignment.status === 'overdue' 
                        ? 'Submit Now' 
                        : assignment.status === 'submitted'
                        ? 'View Submission'
                        : 'View Details'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};

export default MyAssignments;
