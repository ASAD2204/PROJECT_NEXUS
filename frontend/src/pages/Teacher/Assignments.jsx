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

import { useState, useEffect } from 'react';
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
import { teacherAPI } from '../../api/teacher';
import { lmsAPI } from '../../api/lms';

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const normalizeAssignment = (assignment) => {
  const submissions = toFiniteNumber(assignment?.submissions ?? assignment?.submission_count, 0);
  const graded = toFiniteNumber(assignment?.graded ?? assignment?.graded_count, 0);
  const pending = toFiniteNumber(assignment?.pending ?? assignment?.pending_review ?? Math.max(submissions - graded, 0), 0);
  const totalMarks = toFiniteNumber(assignment?.total_marks ?? assignment?.totalMarks, 0);
  const dueDate = assignment?.due_date || assignment?.dueDate || null;
  const title = safeText(assignment?.title, 'Untitled Assignment');
  const courseName = safeText(assignment?.courseName || assignment?.course_name || assignment?.course_title || assignment?.course || 'Unassigned Section');

  return {
    ...assignment,
    id: assignment?.assignment_id ?? assignment?.id,
    title,
    course: safeText(assignment?.course || assignment?.course_code || assignment?.section_code || 'Section'),
    courseName,
    dueDate,
    submissions,
    graded,
    pending,
    totalMarks,
    totalStudents: toFiniteNumber(assignment?.totalStudents ?? assignment?.total_students, submissions || 1),
    type: safeText(assignment?.type, 'Assignment'),
    status: safeText(assignment?.status, 'draft').toLowerCase(),
    avgGrade: toFiniteNumber(assignment?.avgGrade ?? assignment?.avg_grade, 0),
  };
};

const Assignments = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [stats, setStats] = useState([
    { title: 'Total Assignments', value: '—', icon: AssignmentIcon, color: 'primary.main', tooltip: '' },
    { title: 'Active', value: '—', icon: Schedule, color: 'success.main', tooltip: '' },
    { title: 'Pending Review', value: '—', icon: PendingActions, color: 'warning.main', tooltip: '' },
    { title: 'Graded', value: '—', icon: Grade, color: 'info.main', tooltip: '' },
  ]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await teacherAPI.getMyAssignments();
        const data = res.data?.assignments || res.data || [];
        const normalized = (Array.isArray(data) ? data : []).map(normalizeAssignment);
        setAssignments(normalized);
        const active = normalized.filter((assignment) => assignment.status === 'active').length;
        const pending = normalized.reduce((sum, assignment) => sum + assignment.pending, 0);
        const graded = normalized.reduce((sum, assignment) => sum + assignment.graded, 0);
        setStats([
          { title: 'Total Assignments', value: String(normalized.length), icon: AssignmentIcon, color: 'primary.main', tooltip: 'Total assignments across all courses' },
          { title: 'Active', value: String(active), icon: Schedule, color: 'success.main', tooltip: 'Currently open for submissions' },
          { title: 'Pending Review', value: String(pending), icon: PendingActions, color: 'warning.main', tooltip: 'Submissions awaiting grading' },
          { title: 'Graded', value: String(graded), icon: Grade, color: 'info.main', tooltip: 'Graded submissions' },
        ]);
      } catch (e) { console.error('Failed to load assignments', e); }
    };
    fetchAssignments();
  }, []);

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

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await lmsAPI.deleteAssignment(selectedAssignment.id);
      setAssignments(assignments.filter(a => a.id !== selectedAssignment.id));
      handleMenuClose();
    } catch (e) {
      console.error('Failed to delete assignment', e);
      alert('Failed to delete assignment');
    }
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
    const totalStudents = Math.max(1, toFiniteNumber(assignment.totalStudents, assignment.submissions || 1));
    const submissions = toFiniteNumber(assignment.submissions, 0);
    const graded = toFiniteNumber(assignment.graded, 0);
    const pending = toFiniteNumber(assignment.pending, 0);
    const totalMarks = toFiniteNumber(assignment.totalMarks, 0);
    const submissionRate = Math.min(100, (submissions / totalStudents) * 100) || 0;
    const gradedRate = submissions > 0 ? (graded / submissions) * 100 : 0;

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

          {assignment.status !== 'draft' && assignment.dueDate && !Number.isNaN(new Date(assignment.dueDate).getTime()) && (
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
                  {submissions}/{totalStudents}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Pending Review
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {pending}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Graded
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="info.main">
                  {graded}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Marks
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {totalMarks}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {assignment.status !== 'draft' && submissions > 0 && (
            <>
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submission Rate
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {Number.isFinite(submissionRate) ? submissionRate.toFixed(0) : '0'}%
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
                    {Number.isFinite(gradedRate) ? gradedRate.toFixed(0) : '0'}%
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
        <MenuItem onClick={handleDeleteAssignment} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Assignment
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Assignments;
