/**
 * Assignment Management Page - Teacher View
 * 
 * Allows teachers to manage all their assignments across courses.
 * Displays submission statistics and grading progress.
 * 
 * Features:
 * - Statistics cards (total, active, pending review, graded)
 * - Tabbed interface (Active, Completed, Drafts)
 * - Assignment cards with submission and grading metrics
 * - Progress bars for submissions and grading status
 * - Quick navigation to view submissions and edit assignments
 * - Context menu for additional actions
 * - Responsive card layout
 * 
 * @component
 */

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
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment as AssignmentIcon,
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Schedule,
  People,
  CheckCircle,
  PendingActions,
  Grade,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const Assignments = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const stats = [
    {
      title: 'Total Assignments',
      value: '24',
      icon: AssignmentIcon,
      color: 'primary.main',
      tooltip: 'Total assignments created across all your courses. Manage and track assignment submissions',
    },
    {
      title: 'Active',
      value: '8',
      icon: Schedule,
      color: 'success.main',
      tooltip: 'Assignments currently open for student submissions. Students can submit before due date',
    },
    {
      title: 'Pending Review',
      value: '45',
      icon: PendingActions,
      color: 'warning.main',
      tooltip: 'Total submissions across all assignments awaiting your grading and feedback',
    },
    {
      title: 'Graded',
      value: '186',
      icon: Grade,
      color: 'info.main',
      tooltip: 'Submissions that have been graded. Students can view their marks and feedback',
    },
  ];

  const assignments = [
    {
      id: 1,
      title: 'Binary Search Tree Implementation',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'Lab Assignment',
      dueDate: '2026-01-28',
      totalMarks: 100,
      submissions: 67,
      totalStudents: 85,
      pending: 18,
      graded: 50,
      avgGrade: 82,
      status: 'active',
      createdAt: '2026-01-20',
    },
    {
      id: 2,
      title: 'Sorting Algorithms Analysis',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'Theory Assignment',
      dueDate: '2026-02-05',
      totalMarks: 50,
      submissions: 45,
      totalStudents: 85,
      pending: 40,
      graded: 5,
      avgGrade: 75,
      status: 'active',
      createdAt: '2026-01-22',
    },
    {
      id: 3,
      title: 'OOP Design Patterns',
      course: 'CS-201',
      courseName: 'Object Oriented Programming',
      type: 'Project',
      dueDate: '2026-02-10',
      totalMarks: 150,
      submissions: 32,
      totalStudents: 92,
      pending: 32,
      graded: 0,
      avgGrade: 0,
      status: 'active',
      createdAt: '2026-01-18',
    },
    {
      id: 4,
      title: 'Graph Traversal Lab',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'Lab Assignment',
      dueDate: '2026-01-15',
      totalMarks: 100,
      submissions: 85,
      totalStudents: 85,
      pending: 0,
      graded: 85,
      avgGrade: 88,
      status: 'completed',
      createdAt: '2026-01-08',
    },
    {
      id: 5,
      title: 'Inheritance & Polymorphism',
      course: 'CS-201',
      courseName: 'Object Oriented Programming',
      type: 'Lab Assignment',
      dueDate: '2026-01-12',
      totalMarks: 75,
      submissions: 89,
      totalStudents: 92,
      pending: 0,
      graded: 89,
      avgGrade: 79,
      status: 'completed',
      createdAt: '2026-01-05',
    },
    {
      id: 6,
      title: 'Database Normalization',
      course: 'CS-401',
      courseName: 'Database Systems',
      type: 'Theory Assignment',
      dueDate: '2026-02-15',
      totalMarks: 50,
      submissions: 0,
      totalStudents: 65,
      pending: 0,
      graded: 0,
      avgGrade: 0,
      status: 'draft',
      createdAt: '2026-01-23',
    },
  ];

  const activeAssignments = assignments.filter(a => a.status === 'active');
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const draftAssignments = assignments.filter(a => a.status === 'draft');

  const handleMenuOpen = (event, assignment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAssignment(assignment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAssignment(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const AssignmentCard = ({ assignment }) => {
    const submissionRate = (assignment.submissions / assignment.totalStudents) * 100;
    const gradedRate = assignment.submissions > 0 ? (assignment.graded / assignment.submissions) * 100 : 0;

    return (
      <Card
        sx={{
          height: '100%',
          minHeight: 380,
          borderRadius: 3,
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(102,126,234,0.15)'
            : 'rgba(102,126,234,0.12)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0,0,0,0.4)'
              : '0 8px 24px rgba(102,126,234,0.15)',
            borderColor: 'primary.main',
          },
        }}
      >
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Stack direction="row" spacing={1}>
              <Chip
                label={assignment.status}
                size="small"
                color={getStatusColor(assignment.status)}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
              <Chip
                label={assignment.type}
                size="small"
                variant="outlined"
              />
            </Stack>
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, assignment)}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {assignment.title}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {assignment.course} - {assignment.courseName}
          </Typography>

          {assignment.status !== 'draft' && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              📅 Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Typography>
          )}

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              mb: 2,
            }}
          >
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Submissions
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {assignment.submissions}/{assignment.totalStudents}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Pending Review
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {assignment.pending}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Graded
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="info.main">
                  {assignment.graded}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Marks
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {assignment.totalMarks}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {assignment.status !== 'draft' && assignment.submissions > 0 && (
            <>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submission Rate
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {submissionRate.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={submissionRate}
                  color="success"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Grading Progress
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {gradedRate.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={gradedRate}
                  color="info"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              {assignment.graded > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  📊 Average Grade: <strong>{assignment.avgGrade}%</strong>
                </Typography>
              )}
            </>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<Visibility />}
              onClick={() => navigate(`/teacher/assignment/${assignment.id}/submissions`)}
              disabled={assignment.status === 'draft'}
              sx={{ 
                py: 1,
                minWidth: 0,
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Submissions
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                View
              </Box>
            </Button>
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<Edit />}
              onClick={() => navigate(`/teacher/assignment/${assignment.id}/edit`)}
              sx={{ py: 1 }}
            >
              Edit
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const currentAssignments = activeTab === 0 ? activeAssignments : activeTab === 1 ? completedAssignments : draftAssignments;

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={AssignmentIcon}
        title="Assignment Management"
        subtitle="Create, manage, and grade assignments for your courses"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        action={
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => navigate('/teacher/create-assignment')}
            sx={{ px: 3 }}
          >
            Create Assignment
          </Button>
        }
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
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index} component={motion.div} variants={fadeInUp}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              tooltip={stat.tooltip}
            />
          </Grid>
        ))}
      </Grid>

      {/* TABS */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Active
                <Chip label={activeAssignments.length} size="small" color="success" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Completed
                <Chip label={completedAssignments.length} size="small" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Drafts
                <Chip label={draftAssignments.length} size="small" color="warning" />
              </Box>
            }
          />
        </Tabs>
      </Card>

      {/* ASSIGNMENT CARDS */}
      <Grid
        container
        spacing={3}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {currentAssignments.map((assignment) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment.id} component={motion.div} variants={fadeInUp}>
            <AssignmentCard assignment={assignment} />
          </Grid>
        ))}
      </Grid>

      {currentAssignments.length === 0 && (
        <Card sx={{ borderRadius: 3, textAlign: 'center', py: 8 }}>
          <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No {activeTab === 0 ? 'active' : activeTab === 1 ? 'completed' : 'draft'} assignments
          </Typography>
        </Card>
      )}

      {/* MENU */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { navigate(`/teacher/assignment/${selectedAssignment?.id}/edit`); handleMenuClose(); }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Assignment
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/teacher/assignment/${selectedAssignment?.id}/submissions`); handleMenuClose(); }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Submissions
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Assignment
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Assignments;
