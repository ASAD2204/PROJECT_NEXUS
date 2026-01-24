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
import { fadeInUp, staggerContainer } from '../../utils/animations';

const Quizzes = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  const stats = [
    {
      title: 'Total Quizzes',
      value: '18',
      icon: QuizIcon,
      color: 'primary.main',
    },
    {
      title: 'Active Quizzes',
      value: '5',
      icon: Schedule,
      color: 'success.main',
    },
    {
      title: 'Total Attempts',
      value: '432',
      icon: People,
      color: 'info.main',
    },
    {
      title: 'Avg Score',
      value: '78%',
      icon: TrendingUp,
      color: 'warning.main',
    },
  ];

  const quizzes = [
    {
      id: 1,
      title: 'Data Structures Fundamentals',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'MCQ',
      questions: 20,
      duration: 30,
      totalMarks: 20,
      attempts: 78,
      avgScore: 82,
      status: 'active',
      startDate: '2026-01-25 09:00',
      endDate: '2026-01-25 18:00',
      createdAt: '2026-01-20',
    },
    {
      id: 2,
      title: 'Binary Search Trees',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'Mixed',
      questions: 15,
      duration: 25,
      totalMarks: 25,
      attempts: 65,
      avgScore: 76,
      status: 'active',
      startDate: '2026-01-26 10:00',
      endDate: '2026-01-26 20:00',
      createdAt: '2026-01-22',
    },
    {
      id: 3,
      title: 'OOP Concepts Quiz',
      course: 'CS-201',
      courseName: 'Object Oriented Programming',
      type: 'MCQ',
      questions: 25,
      duration: 40,
      totalMarks: 25,
      attempts: 85,
      avgScore: 79,
      status: 'completed',
      startDate: '2026-01-15 11:00',
      endDate: '2026-01-15 23:59',
      createdAt: '2026-01-10',
    },
    {
      id: 4,
      title: 'Sorting Algorithms',
      course: 'CS-301',
      courseName: 'Data Structures & Algorithms',
      type: 'MCQ',
      questions: 18,
      duration: 30,
      totalMarks: 20,
      attempts: 82,
      avgScore: 84,
      status: 'completed',
      startDate: '2026-01-12 09:00',
      endDate: '2026-01-12 18:00',
      createdAt: '2026-01-08',
    },
    {
      id: 5,
      title: 'Inheritance & Polymorphism',
      course: 'CS-201',
      courseName: 'Object Oriented Programming',
      type: 'Mixed',
      questions: 20,
      duration: 35,
      totalMarks: 30,
      attempts: 0,
      avgScore: 0,
      status: 'draft',
      startDate: '2026-02-01 10:00',
      endDate: '2026-02-01 22:00',
      createdAt: '2026-01-23',
    },
  ];

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

        {quiz.status !== 'draft' && (
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
          >
            Results
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<Edit />}
            onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
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
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: stat.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <stat.icon sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
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
