import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment,
  CheckCircle,
  PendingActions,
  Visibility,
  GetApp,
  Grade,
  ArrowBack,
  Send,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const ViewSubmissions = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const [tabValue, setTabValue] = useState(0);
  const [gradeDialog, setGradeDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');

  // Mock assignment data
  const assignment = {
    id: 1,
    title: 'Database Design Assignment',
    course: 'Database Systems',
    courseCode: 'CS-401',
    dueDate: '2026-01-30',
    totalMarks: 100,
    description: 'Design a normalized database schema for an e-commerce system',
  };

  // Mock submissions data
  const [submissions] = useState([
    {
      id: 1,
      studentId: 'CS-2022-001',
      studentName: 'Ahmed Ali',
      submittedDate: '2026-01-28',
      status: 'graded',
      marksObtained: 85,
      feedback: 'Excellent work! Good normalization.',
      files: ['database_design.pdf'],
    },
    {
      id: 2,
      studentId: 'CS-2022-002',
      studentName: 'Fatima Khan',
      submittedDate: '2026-01-29',
      status: 'graded',
      marksObtained: 92,
      feedback: 'Outstanding! Clear ER diagrams.',
      files: ['schema.pdf', 'er_diagram.png'],
    },
    {
      id: 3,
      studentId: 'CS-2022-003',
      studentName: 'Hassan Raza',
      submittedDate: '2026-01-30',
      status: 'pending',
      marksObtained: null,
      feedback: null,
      files: ['project.pdf'],
    },
    {
      id: 4,
      studentId: 'CS-2022-004',
      studentName: 'Sara Ahmed',
      submittedDate: null,
      status: 'not-submitted',
      marksObtained: null,
      feedback: null,
      files: [],
    },
  ]);

  const stats = {
    total: submissions.filter(s => s.status !== 'not-submitted').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    graded: submissions.filter(s => s.status === 'graded').length,
    notSubmitted: submissions.filter(s => s.status === 'not-submitted').length,
  };

  const handleGradeClick = (submission) => {
    setSelectedSubmission(submission);
    setMarks(submission.marksObtained || '');
    setFeedback(submission.feedback || '');
    setGradeDialog(true);
  };

  const handleSubmitGrade = () => {
    console.log('Submitting grade for:', selectedSubmission.studentId);
    console.log('Marks:', marks);
    console.log('Feedback:', feedback);
    setGradeDialog(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded': return 'success';
      case 'pending': return 'warning';
      case 'not-submitted': return 'error';
      default: return 'default';
    }
  };

  const filteredSubmissions = tabValue === 0 
    ? submissions
    : tabValue === 1 
    ? submissions.filter(s => s.status === 'pending')
    : tabValue === 2
    ? submissions.filter(s => s.status === 'graded')
    : submissions.filter(s => s.status === 'not-submitted');

  return (
    <Box className="page-container">
      {/* HEADER */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/teacher/courses')}
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>
        <PageHeader
          icon={Assignment}
          title={assignment.title}
          subtitle={`${assignment.courseCode} - ${assignment.course} | Due: ${new Date(assignment.dueDate).toLocaleDateString()}`}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      </Box>

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
            title="Submissions"
            value={stats.total}
            icon={Assignment}
            color="primary"
            tooltip="Total submissions received. Students who submitted their assignment before or on the due date"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Pending Grading"
            value={stats.pending}
            icon={Schedule}
            color="warning"
            tooltip="Submissions awaiting your review and grading. These need to be graded and given feedback"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Graded"
            value={stats.graded}
            icon={CheckCircle}
            color="success"
            tooltip="Submissions that have been graded with marks and feedback. Students can view their results"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Not Submitted"
            value={stats.notSubmitted}
            icon={Cancel}
            color="error"
            tooltip="Students who did not submit the assignment. May need follow-up or extension consideration"
          />
        </Grid>
      </Grid>

      {/* SUBMISSIONS TABLE */}
      <Card
        component={motion.div}
        variants={fadeInUp}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' 
            ? 'rgba(102,126,234,0.15)' 
            : 'rgba(102,126,234,0.12)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 24px rgba(0,0,0,0.3)'
            : '0 8px 24px rgba(102,126,234,0.12)',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, val) => setTabValue(val)}
            sx={{ px: 2 }}
          >
            <Tab label="All" />
            <Tab label="Pending" />
            <Tab label="Graded" />
            <Tab label="Not Submitted" />
          </Tabs>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Typography fontWeight="bold">Student ID</Typography></TableCell>
                <TableCell><Typography fontWeight="bold">Name</Typography></TableCell>
                <TableCell><Typography fontWeight="bold">Submitted Date</Typography></TableCell>
                <TableCell><Typography fontWeight="bold">Status</Typography></TableCell>
                <TableCell><Typography fontWeight="bold">Marks</Typography></TableCell>
                <TableCell align="center"><Typography fontWeight="bold">Actions</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {submission.studentId}
                    </Typography>
                  </TableCell>
                  <TableCell>{submission.studentName}</TableCell>
                  <TableCell>
                    {submission.submittedDate 
                      ? new Date(submission.submittedDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={submission.status.replace('-', ' ').toUpperCase()}
                      color={getStatusColor(submission.status)}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    {submission.status === 'graded' ? (
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight="bold">
                          {submission.marksObtained}/{assignment.totalMarks}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={(submission.marksObtained / assignment.totalMarks) * 100}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </Stack>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {submission.status !== 'not-submitted' && (
                        <>
                          <IconButton size="small" color="primary">
                            <Visibility />
                          </IconButton>
                          <IconButton size="small" color="primary">
                            <GetApp />
                          </IconButton>
                          <Button
                            size="small"
                            variant={submission.status === 'pending' ? 'contained' : 'outlined'}
                            startIcon={<Grade />}
                            onClick={() => handleGradeClick(submission)}
                            sx={{
                              ...(submission.status === 'pending' ? {
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              } : {}),
                            }}
                          >
                            {submission.status === 'graded' ? 'Edit' : 'Grade'}
                          </Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* GRADE DIALOG */}
      <Dialog 
        open={gradeDialog} 
        onClose={() => setGradeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Grade Assignment - {selectedSubmission?.studentName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Marks Obtained"
              type="number"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              InputProps={{
                endAdornment: <Typography>/ {assignment.totalMarks}</Typography>,
              }}
            />
            <TextField
              fullWidth
              label="Feedback"
              multiline
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide detailed feedback to the student..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setGradeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmitGrade}
            disabled={!marks}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #654391 100%)',
              },
            }}
          >
            Submit Grade
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ViewSubmissions;
