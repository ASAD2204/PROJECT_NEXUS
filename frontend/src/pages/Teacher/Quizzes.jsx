/**
 * Quiz Management Page - Teacher View
 * 
 * Allows teachers to manage quizzes for their courses.
 * Displays quiz statistics and student performance metrics.
 * 
 * Features:
 * - Statistics cards (total quizzes, active, attempts, avg score)
 * - Tabbed interface (Active, Completed, Drafts)
 * - Quiz cards with question count, duration, and attempt statistics
 * - Average score indicators
 * - Quick navigation to view results and edit quizzes
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Quiz as QuizIcon,
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Timer,
  QuestionAnswer,
  CheckCircle,
  Schedule,
  People,
  TrendingUp,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { teacherAPI } from '../../api/teacher';

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

const normalizeQuiz = (quiz) => {
  const totalMarks = toFiniteNumber(quiz?.totalMarks ?? quiz?.total_marks, 0);
  const duration = toFiniteNumber(quiz?.duration ?? quiz?.duration_minutes, 0);
  const attempts = toFiniteNumber(quiz?.attempts, 0);
  const avgScore = toFiniteNumber(quiz?.avgScore ?? quiz?.avg_score, 0);

  return {
    ...quiz,
    id: quiz?.quiz_id ?? quiz?.id,
    title: safeText(quiz?.title, 'Untitled Quiz'),
    course: safeText(quiz?.course || quiz?.course_code || quiz?.section_code || 'Section'),
    courseName: safeText(quiz?.courseName || quiz?.course_name || quiz?.course_title || 'Unassigned Section'),
    status: safeText(quiz?.status, 'draft').toLowerCase(),
    duration,
    attempts,
    avgScore,
    totalMarks,
    questions: toFiniteNumber(quiz?.questions ?? quiz?.question_count ?? quiz?.total_questions, 0),
    startDate: quiz?.startDate || quiz?.start_time || null,
  };
};

const Quizzes = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const [stats, setStats] = useState([
    { title: 'Total Quizzes', value: '—', icon: QuizIcon, color: 'primary.main', tooltip: '' },
    { title: 'Active Quizzes', value: '—', icon: Schedule, color: 'success.main', tooltip: '' },
    { title: 'Total Attempts', value: '—', icon: People, color: 'info.main', tooltip: '' },
    { title: 'Avg Score', value: '—', icon: TrendingUp, color: 'warning.main', tooltip: '' },
  ]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await teacherAPI.getMyQuizzes();
        const data = res.data?.quizzes || res.data || [];
        const normalized = (Array.isArray(data) ? data : []).map(normalizeQuiz);
        setQuizzes(normalized);
        const active = normalized.filter((quiz) => quiz.status === 'active').length;
        const totalAttempts = normalized.reduce((sum, quiz) => sum + quiz.attempts, 0);
        const avgScore = normalized.length ? Math.round(normalized.reduce((sum, quiz) => sum + quiz.avgScore, 0) / normalized.length) : 0;
        setStats([
          { title: 'Total Quizzes', value: String(normalized.length), icon: QuizIcon, color: 'primary.main', tooltip: 'Total quizzes created' },
          { title: 'Active Quizzes', value: String(active), icon: Schedule, color: 'success.main', tooltip: 'Currently open for attempts' },
          { title: 'Total Attempts', value: String(totalAttempts), icon: People, color: 'info.main', tooltip: 'Total student attempts' },
          { title: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp, color: 'warning.main', tooltip: 'Average across all attempts' },
        ]);
      } catch (e) { console.error('Failed to load quizzes', e); }
    };
    fetchQuizzes();
  }, []);

  const activeQuizzes = quizzes.filter(q => q.status === 'active');
  const completedQuizzes = quizzes.filter(q => q.status === 'completed');
  const draftQuizzes = quizzes.filter(q => q.status === 'draft');

  const handleMenuOpen = (event, quiz) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuiz(quiz);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuiz(null);
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

  const QuizCard = ({ quiz }) => (
    <Card
      sx={{
        height: '100%',
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
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Chip
            label={quiz.status}
            size="small"
            color={getStatusColor(quiz.status)}
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
          />
          <IconButton size="small" onClick={(e) => handleMenuOpen(e, quiz)}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {quiz.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {quiz.course} - {quiz.courseName}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2 }}>
          <Chip
            icon={<QuestionAnswer sx={{ fontSize: 16 }} />}
            label={`${quiz.questions} Questions`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<Timer sx={{ fontSize: 16 }} />}
            label={`${quiz.duration} mins`}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            mb: 2,
          }}
        >
          <Grid container spacing={2}>
            <Grid size={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Attempts
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {quiz.attempts}
              </Typography>
            </Grid>
            <Grid size={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Avg Score
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {quiz.avgScore}%
              </Typography>
            </Grid>
            <Grid size={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Marks
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {quiz.totalMarks}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {quiz.status !== 'draft' && quiz.startDate && !Number.isNaN(new Date(quiz.startDate).getTime()) && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            📅 {new Date(quiz.startDate).toLocaleString()}
          </Typography>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            onClick={() => navigate(`/teacher/quiz/${quiz.id}/results`)}
            disabled={quiz.status === 'draft' || quiz.attempts === 0}
            sx={{ 
              py: 1,
              minWidth: 0,
            }}
          >
            Results
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<Edit />}
            onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
            sx={{ py: 1 }}
          >
            Edit
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  const currentQuizzes = activeTab === 0 ? activeQuizzes : activeTab === 1 ? completedQuizzes : draftQuizzes;

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={QuizIcon}
        title="Quiz Management"
        subtitle="Create, manage, and analyze quizzes for your courses"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        action={
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => navigate('/teacher/quiz/create')}
            sx={{ px: 3 }}
          >
            Create Quiz
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
                <Chip label={activeQuizzes.length} size="small" color="success" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Completed
                <Chip label={completedQuizzes.length} size="small" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Drafts
                <Chip label={draftQuizzes.length} size="small" color="warning" />
              </Box>
            }
          />
        </Tabs>
      </Card>

      {/* QUIZ CARDS */}
      <Grid
        container
        spacing={3}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {currentQuizzes.map((quiz) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quiz.id} component={motion.div} variants={fadeInUp}>
            <QuizCard quiz={quiz} />
          </Grid>
        ))}
      </Grid>

      {currentQuizzes.length === 0 && (
        <Card sx={{ borderRadius: 3, textAlign: 'center', py: 8 }}>
          <QuizIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No {activeTab === 0 ? 'active' : activeTab === 1 ? 'completed' : 'draft'} quizzes
          </Typography>
        </Card>
      )}

      {/* MENU */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { navigate(`/teacher/quiz/${selectedQuiz?.id}/edit`); handleMenuClose(); }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Quiz
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/teacher/quiz/${selectedQuiz?.id}/results`); handleMenuClose(); }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Results
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Quiz
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Quizzes;
