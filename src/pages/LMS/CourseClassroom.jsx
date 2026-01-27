/**
 * Course Classroom Page
 * 
 * Detailed view of a specific course with all course materials and activities.
 * Central hub for course content, assignments, announcements, and resources.
 * 
 * Features:
 * - Course overview with instructor info
 * - Tabbed interface (Overview, Assignments, Materials, Announcements)
 * - Assignment list with due dates and submission status
 * - Course materials and resources
 * - Announcements and updates
 * - Progress tracking
 * - Quick actions (mark attendance, submit assignments)
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  IconButton,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Badge,
  Menu,
  MenuItem,
  ListItemAvatar,
  CardActions,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Stack,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment,
  Quiz,
  Article,
  CloudDownload,
  Campaign,
  ArrowBack,
  ExitToApp,
  Search,
  ViewList,
  ViewModule,
  ExpandMore,
  PictureAsPdf,
  VideoLibrary,
  Slideshow,
  CheckCircle,
  People,
  EmojiEvents,
  AttachFile,
  Send,
  ThumbUp,
  Comment,
  MoreVert,
  Email,
  Schedule,
  TrendingUp,
  Notifications,
  Edit,
  FilterList,
  Sort,
  AccessTime,
  CheckCircleOutline,
  RadioButtonUnchecked,
  BarChart,
  Help,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { courses, assignments, quizzes, announcements, currentUser } from '../../data/dummyData';
import StatusBadge from '../../components/Common/StatusBadge';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const CourseClassroom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // list or grid
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [postContent, setPostContent] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [sortBy, setSortBy] = useState('dueDate');
  const [anchorEl, setAnchorEl] = useState(null);

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  const course = courses.find((c) => c.id === id);
  const courseAssignments = assignments.filter((a) => a.courseId === id);
  const courseQuizzes = quizzes.filter((q) => q.courseId === id);
  const courseAnnouncements = announcements.filter((a) => a.courseId === id);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newPost = {
          id: `ann-${Date.now()}`,
          title: 'New Announcement',
          content: 'This is a simulated real-time announcement update!',
          postedBy: 'Dr. Sarah Ahmed',
          postedOn: new Date().toLocaleString(),
          type: 'Info',
          likes: 0,
          comments: []
        };
        setNewAnnouncement(newPost);
        setTimeout(() => setNewAnnouncement(null), 5000);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!course) {
    return (
      <Box>
        <Typography>Course not found</Typography>
      </Box>
    );
  }

  const courseProgress = 68;
  const enrolledStudents = 45;
  const isFaculty = currentUser.role === 'faculty' || false;

  // Calculate countdown timer for assignments
  const getCountdown = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    
    if (diff <= 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `Due in ${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    return `Due in ${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  // Filter assignments
  const filteredAssignments = courseAssignments.filter(a => {
    if (assignmentFilter === 'all') return true;
    if (assignmentFilter === 'pending') return a.status === 'Pending';
    if (assignmentFilter === 'submitted') return a.status === 'Submitted';
    if (assignmentFilter === 'graded') return a.status === 'Graded';
    return true;
  });

  // Mock data for grades
  const gradeData = [
    { name: 'Assignment 1', category: 'Assignment', earned: 23, total: 25, percentage: 92, weight: 10 },
    { name: 'Quiz 1', category: 'Quiz', earned: 18, total: 20, percentage: 90, weight: 5 },
    { name: 'Midterm', category: 'Exam', earned: 38, total: 50, percentage: 76, weight: 30 },
    { name: 'Assignment 2', category: 'Assignment', earned: 20, total: 25, percentage: 80, weight: 10 },
    { name: 'Project', category: 'Project', earned: 42, total: 50, percentage: 84, weight: 25 },
  ];

  const finalGrade = 82.5;
  const gradeStatus = 'B+';

  const chartData = [
    { name: 'Class Avg', value: 78 },
    { name: 'Your Grade', value: finalGrade },
  ];

  // Mock modules
  const modules = [
    {
      id: 1,
      title: 'Week 1: Introduction to Database Systems',
      items: [
        { id: 1, type: 'pdf', title: 'Lecture Slides - Introduction', completed: true },
        { id: 2, type: 'video', title: 'Video Lecture: Database Concepts', completed: true },
        { id: 3, type: 'ppt', title: 'Presentation: ER Diagrams', completed: false },
      ]
    },
    {
      id: 2,
      title: 'Week 2: Relational Model',
      items: [
        { id: 4, type: 'pdf', title: 'Relational Algebra Notes', completed: true },
        { id: 5, type: 'video', title: 'SQL Basics Tutorial', completed: false },
        { id: 6, type: 'pdf', title: 'Practice Problems', completed: false },
      ]
    },
    {
      id: 3,
      title: 'Week 3: Normalization',
      items: [
        { id: 7, type: 'pdf', title: 'Normalization Theory', completed: false },
        { id: 8, type: 'ppt', title: 'Functional Dependencies', completed: false },
      ]
    },
  ];

  // Mock classmates
  const classmates = [
    { id: 1, name: 'Ahmed Ali', rollNo: 'BSCS-20-001', avatar: null },
    { id: 2, name: 'Fatima Khan', rollNo: 'BSCS-20-002', avatar: null },
    { id: 3, name: 'Hassan Raza', rollNo: 'BSCS-20-003', avatar: null },
    { id: 4, name: 'Ayesha Malik', rollNo: 'BSCS-20-004', avatar: null },
    { id: 5, name: 'Usman Sheikh', rollNo: 'BSCS-20-005', avatar: null },
    { id: 6, name: 'Zara Mahmood', rollNo: 'BSCS-20-006', avatar: null },
  ];

  const handlePostAnnouncement = () => {
    if (postContent.trim()) {
      // Simulate posting
      alert('Announcement posted: ' + postContent);
      setPostContent('');
    }
  };

  const toggleComments = (announcementId) => {
    setExpandedComments(prev => ({
      ...prev,
      [announcementId]: !prev[announcementId]
    }));
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <PictureAsPdf color="error" />;
      case 'video': return <VideoLibrary color="primary" />;
      case 'ppt': return <Slideshow color="warning" />;
      default: return <Article />;
    }
  };

  // Show loading skeleton
  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/lms')}
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Loading Course...
          </Typography>
        </Box>
        <GridSkeleton items={6} columns={{ xs: 12, md: 6 }} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/lms')}
        sx={{ mb: 2 }}
      >
        Back to Courses
      </Button>

      {/* New Announcement Notification */}
      {newAnnouncement && (
        <Alert 
          severity="info" 
          icon={<Notifications />}
          sx={{ mb: 2, animation: 'slideUp 0.5s ease' }}
        >
          <Typography variant="body2" fontWeight="bold">
            New announcement posted in {course.title}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 9 }}>
          {/* HEADER SECTION */}
          <Card sx={{ mb: 3, overflow: 'hidden' }}>
            <Box
              sx={{
                height: 300,
                backgroundImage: course.coverImage ? `url(${course.coverImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
                },
              }}
            >
              {/* Course Info Overlay - Bottom Left */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: { xs: 10, sm: 20 },
                  left: { xs: 10, sm: 20 },
                  color: 'white',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: { xs: 1, sm: 2 },
                }}
              >
                <Avatar 
                  src={course.instructorPhoto} 
                  sx={{ width: { xs: 50, sm: 70 }, height: { xs: 50, sm: 70 }, border: '3px solid white' }}
                />
                <Box>
                  <Chip 
                    label={course.code} 
                    size="small"
                    sx={{ 
                      mb: 1, 
                      backgroundColor: 'rgba(255,255,255,0.9)', 
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                    }} 
                  />
                  <Typography variant="h4" fontWeight="bold" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                    {course.title}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    <People fontSize="small" />
                    {course.instructor} • {enrolledStudents} students enrolled
                  </Typography>
                </Box>
              </Box>

              {/* Progress Indicator - Top Right (Hidden on mobile) */}
              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 10, sm: 20 },
                  right: { xs: 10, sm: 20 },
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: 3,
                  p: { xs: 1, sm: 2 },
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={courseProgress} 
                    size={80}
                    thickness={5}
                    sx={{ color: 'primary.main' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {courseProgress}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Complete
                </Typography>
              </Box>
            </Box>

            {/* ACTION BAR */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' }, 
              px: { xs: 0, sm: 2 }, 
              py: { xs: 0, sm: 1 }, 
              borderBottom: 1, 
              borderColor: 'divider',
              gap: { xs: 0, sm: 1 }
            }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ 
                  minHeight: { xs: 48, sm: 48 },
                  flex: 1,
                  '& .MuiTabs-scrollButtons': {
                    display: { xs: 'flex', sm: 'flex' }
                  }
                }}
              >
                <Tab label="Stream" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
                <Tab label="Assignments" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
                <Tab label="Quizzes" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
                <Tab label="Content" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
                <Tab label="Grades" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
                <Tab label="People" sx={{ minHeight: { xs: 48, sm: 48 }, px: { xs: 2, sm: 2 }, fontSize: { xs: '0.875rem', sm: '0.875rem' } }} />
              </Tabs>
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                justifyContent: { xs: 'center', sm: 'flex-end' },
                p: { xs: 1, sm: 0 },
                borderTop: { xs: 1, sm: 0 },
                borderColor: { xs: 'divider', sm: 'transparent' }
              }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<ExitToApp />}
                  color="error"
                  sx={{ 
                    minWidth: { xs: 'auto', sm: 120 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Leave Course</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Leave</Box>
                </Button>
              </Box>
            </Box>
          </Card>

          {/* TAB CONTENT */}
          <Box>
            {/* STREAM TAB */}
            {activeTab === 0 && (
              <Box>
                {/* Post Composer (Faculty Only) */}
                {isFaculty && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Post Announcement
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Share an announcement with your class..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          startIcon={<AttachFile />}
                          size="small"
                          sx={{ minWidth: { xs: 'auto', sm: 110 } }}
                        >
                          Attach File
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          endIcon={<Send />}
                          onClick={handlePostAnnouncement}
                          disabled={!postContent.trim()}
                          sx={{ minWidth: { xs: 90, sm: 100 } }}
                        >
                          Post
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Feed */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {courseAnnouncements.map((announcement) => (
                    <Card key={announcement.id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                          <Avatar>{announcement.postedBy[0]}</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {announcement.postedBy}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {announcement.postedOn}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  label={announcement.type}
                                  size="small"
                                  color={
                                    announcement.type === 'Exam' ? 'error' :
                                    announcement.type === 'Important' ? 'warning' : 'info'
                                  }
                                />
                                <IconButton size="small">
                                  <MoreVert />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>
                              {announcement.title}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }}>
                              {announcement.content}
                            </Typography>
                            {announcement.attachments && (
                              <Chip
                                icon={<AttachFile />}
                                label="Attachment.pdf"
                                sx={{ mt: 2 }}
                                onClick={() => {}}
                              />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                      <Divider />
                      <CardActions sx={{ px: 2, py: 1 }}>
                        <Button 
                          size="small" 
                          startIcon={<ThumbUp />}
                        >
                          Like (12)
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<Comment />}
                          onClick={() => toggleComments(announcement.id)}
                        >
                          Comment (5)
                        </Button>
                      </CardActions>
                      {expandedComments[announcement.id] && (
                        <Box sx={{ px: 2, pb: 2 }}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Comments will be shown here...
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Write a comment..."
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton size="small">
                                    <Send />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Box>
                      )}
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 1 && (
              <Box>
                {/* Filter Bar */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip 
                          label="All" 
                          color={assignmentFilter === 'all' ? 'primary' : 'default'}
                          onClick={() => setAssignmentFilter('all')}
                          clickable
                          size="small"
                        />
                        <Chip 
                          label="Pending" 
                          color={assignmentFilter === 'pending' ? 'warning' : 'default'}
                          onClick={() => setAssignmentFilter('pending')}
                          clickable
                          size="small"
                        />
                        <Chip 
                          label="Submitted" 
                          color={assignmentFilter === 'submitted' ? 'info' : 'default'}
                          onClick={() => setAssignmentFilter('submitted')}
                          clickable
                          size="small"
                        />
                        <Chip 
                          label="Graded" 
                          color={assignmentFilter === 'graded' ? 'success' : 'default'}
                          onClick={() => setAssignmentFilter('graded')}
                          clickable
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'center', md: 'flex-end' } }}>
                        <ToggleButtonGroup
                          value={viewMode}
                          exclusive
                          onChange={(e, newMode) => newMode && setViewMode(newMode)}
                          size="small"
                        >
                          <ToggleButton value="list">
                            <ViewList />
                          </ToggleButton>
                          <ToggleButton value="grid">
                            <ViewModule />
                          </ToggleButton>
                        </ToggleButtonGroup>
                        <Button 
                          size="small" 
                          startIcon={<Sort />}
                          onClick={(e) => setAnchorEl(e.currentTarget)}
                        >
                          Sort
                        </Button>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={() => setAnchorEl(null)}
                        >
                          <MenuItem onClick={() => { setSortBy('dueDate'); setAnchorEl(null); }}>Due Date</MenuItem>
                          <MenuItem onClick={() => { setSortBy('title'); setAnchorEl(null); }}>Title</MenuItem>
                          <MenuItem onClick={() => { setSortBy('status'); setAnchorEl(null); }}>Status</MenuItem>
                        </Menu>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Assignments List/Grid */}
                {viewMode === 'list' ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
                    {filteredAssignments.map((assignment) => (
                      <Card key={assignment.id} component={motion.div} variants={fadeInUp}>
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                                <Assignment color="primary" sx={{ mt: 0.5 }} />
                                <Box>
                                  <Typography variant="h6" fontWeight="bold">
                                    {assignment.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {assignment.description || 'Complete the assignment and submit before the deadline.'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Due Date
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="error">
                                  {getCountdown(assignment.dueDate)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(assignment.dueDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Points
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {assignment.obtainedMarks ? `${assignment.obtainedMarks}/${assignment.totalMarks}` : `--/${assignment.totalMarks}`}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                                <StatusBadge status={assignment.status} type="assignment" />
                                <Button 
                                  variant="contained" 
                                  size="small"
                                  fullWidth
                                  onClick={() => navigate(`/lms/assignment/${assignment.id}`)}
                                >
                                  {assignment.status === 'Pending' ? 'Submit' : 
                                   assignment.status === 'Submitted' ? 'View Submission' : 'View Grade'}
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Grid container spacing={2} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
                    {filteredAssignments.map((assignment) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment.id} component={motion.div} variants={fadeInUp}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <CardContent sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                              <Assignment color="primary" />
                              <StatusBadge status={assignment.status} type="assignment" />
                            </Box>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {assignment.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {assignment.description || 'Complete and submit before deadline.'}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Due
                              </Typography>
                              <Typography variant="caption" fontWeight="bold" color="error">
                                {getCountdown(assignment.dueDate)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">
                                Points
                              </Typography>
                              <Typography variant="caption" fontWeight="bold">
                                {assignment.obtainedMarks ? `${assignment.obtainedMarks}/${assignment.totalMarks}` : `--/${assignment.totalMarks}`}
                              </Typography>
                            </Box>
                          </CardContent>
                          <CardActions>
                            <Button 
                              variant="contained" 
                              size="small"
                              fullWidth
                              onClick={() => navigate(`/lms/assignment/${assignment.id}`)}
                            >
                              {assignment.status === 'Pending' ? 'Submit' : 
                               assignment.status === 'Submitted' ? 'View' : 'View Grade'}
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* QUIZZES TAB */}
            {activeTab === 2 && (
              <Box>
                <Grid container spacing={2}>
                  {courseQuizzes.map((quiz) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={quiz.id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          }
                        }}
                      >
                        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2.5 }}>
                          {/* Header with Icon and Title */}
                          <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                backgroundColor: quiz.status === 'Completed' ? 'success.light' : 
                                                 quiz.status === 'In Progress' ? 'warning.light' : 'secondary.light',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Quiz 
                                sx={{ 
                                  color: quiz.status === 'Completed' ? 'success.dark' : 
                                         quiz.status === 'In Progress' ? 'warning.dark' : 'secondary.dark',
                                  fontSize: 28
                                }} 
                              />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="h6" fontWeight="bold" sx={{ 
                                fontSize: { xs: '1rem', sm: '1.1rem' },
                                lineHeight: 1.3,
                                mb: 0.5
                              }}>
                                {quiz.title}
                              </Typography>
                              <Chip
                                label={quiz.status}
                                size="small"
                                color={quiz.status === 'Completed' ? 'success' : 
                                       quiz.status === 'In Progress' ? 'warning' : 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          </Box>

                          <Divider />

                          {/* Quiz Details */}
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTime sx={{ fontSize: 20, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Duration:
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {quiz.duration} minutes
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Help sx={{ fontSize: 20, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Questions:
                              </Typography>
                              <Typography variant="body2" fontWeight="600">
                                {quiz.questions}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Schedule sx={{ fontSize: 20, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Due Date:
                              </Typography>
                              <Typography variant="body2" fontWeight="600" color="error.main">
                                {quiz.dueDate}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmojiEvents sx={{ fontSize: 20, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Score:
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="primary.main">
                                {quiz.score ? `${quiz.score}/20` : '--/20'}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Progress bar for in-progress quizzes */}
                          {quiz.status === 'In Progress' && (
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Progress
                                </Typography>
                                <Typography variant="caption" fontWeight="600">
                                  {quiz.progress || 50}%
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={quiz.progress || 50} 
                                sx={{ height: 6, borderRadius: 1 }}
                              />
                            </Box>
                          )}
                        </CardContent>

                        {/* Action Button */}
                        <CardActions sx={{ p: 2.5, pt: 0 }}>
                          <Button 
                            variant="contained" 
                            fullWidth
                            size="large"
                            color={quiz.status === 'Not Started' ? 'primary' : 
                                   quiz.status === 'In Progress' ? 'warning' : 'success'}
                            startIcon={
                              quiz.status === 'Not Started' ? <Quiz /> : 
                              quiz.status === 'In Progress' ? <TrendingUp /> : <BarChart />
                            }
                            sx={{
                              py: 1.2,
                              fontWeight: 600,
                              fontSize: { xs: '0.875rem', sm: '0.9375rem' }
                            }}
                          >
                            {quiz.status === 'Not Started' ? 'Start Quiz' : 
                             quiz.status === 'In Progress' ? 'Continue Quiz' : 'View Results'}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Empty State */}
                {courseQuizzes.length === 0 && (
                  <Card>
                    <CardContent sx={{ py: 8, textAlign: 'center' }}>
                      <Quiz sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Quizzes Available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your instructor hasn't posted any quizzes yet.
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}

            {/* CONTENT TAB */}
            {activeTab === 3 && (
              <Box>
                {modules.map((module) => (
                  <Accordion key={module.id} defaultExpanded={module.id === 1}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6" fontWeight="bold">
                        {module.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {module.items.map((item) => (
                          <ListItem
                            key={item.id}
                            sx={{
                              borderRadius: 2,
                              mb: 1,
                              '&:hover': { backgroundColor: 'action.hover' },
                              cursor: 'pointer',
                            }}
                          >
                            <ListItemIcon>
                              {getFileIcon(item.type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.title}
                              secondary={item.type.toUpperCase()}
                            />
                            <Checkbox
                              checked={item.completed}
                              icon={<RadioButtonUnchecked />}
                              checkedIcon={<CheckCircleOutline />}
                            />
                            <IconButton size="small">
                              <CloudDownload />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* GRADES TAB */}
            {activeTab === 4 && (
              <Box>
                {/* Summary Card */}
                <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <CardContent>
                    <Grid container spacing={3} alignItems="center">
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h2" fontWeight="bold" color="white">
                            {finalGrade}%
                          </Typography>
                          <Typography variant="h5" color="white">
                            {gradeStatus}
                          </Typography>
                          <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mt: 1 }}>
                            Final Grade
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, p: 2 }}>
                          <Typography variant="h6" color="white" gutterBottom>
                            Grade Distribution
                          </Typography>
                          <ResponsiveContainer width="100%" height={180}>
                            <RechartsBarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                              <defs>
                                <linearGradient id="yourGradeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#90caf9" stopOpacity={1}/>
                                  <stop offset="100%" stopColor="#64b5f6" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="avgGradeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#fff" stopOpacity={0.9}/>
                                  <stop offset="100%" stopColor="#fff" stopOpacity={0.6}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                              <XAxis 
                                dataKey="name" 
                                stroke="white" 
                                style={{ fontSize: '0.75rem' }}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis 
                                stroke="white" 
                                style={{ fontSize: '0.75rem' }}
                                tickLine={false}
                                axisLine={false}
                                width={35}
                                tick={{ fontSize: 12 }}
                              />
                              <RechartsTooltip 
                                contentStyle={{ 
                                  borderRadius: 8, 
                                  border: 'none',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              />
                              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                <Cell fill="url(#yourGradeGradient)" />
                                <Cell fill="url(#avgGradeGradient)" />
                              </Bar>
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Breakdown Table */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Grade Breakdown
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Assessment</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell align="center"><strong>Points</strong></TableCell>
                            <TableCell align="center"><strong>Percentage</strong></TableCell>
                            <TableCell align="center"><strong>Weight</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gradeData.map((row, index) => (
                            <TableRow
                              key={index}
                              sx={{
                                backgroundColor: 
                                  row.percentage >= 85 ? 'rgba(76, 175, 80, 0.1)' :
                                  row.percentage >= 70 ? 'rgba(255, 193, 7, 0.1)' :
                                  'rgba(244, 67, 54, 0.1)'
                              }}
                            >
                              <TableCell>{row.name}</TableCell>
                              <TableCell>
                                <Chip label={row.category} size="small" />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {row.earned}/{row.total}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={`${row.percentage}%`}
                                  color={
                                    row.percentage >= 85 ? 'success' :
                                    row.percentage >= 70 ? 'warning' : 'error'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">{row.weight}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* PEOPLE TAB */}
            {activeTab === 5 && (
              <Box>
                {/* Instructor Card */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Instructor
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
                      <Avatar 
                        src={course.instructorPhoto} 
                        sx={{ width: 80, height: 80 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {course.instructor}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {course.instructorEmail || 'instructor@university.edu'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip 
                            icon={<Schedule />} 
                            label="Office Hours: Mon-Wed 2-4 PM" 
                            size="small" 
                          />
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Email />}
                      >
                        Send Message
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Classmates */}
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        Classmates ({classmates.length})
                      </Typography>
                      <TextField
                        size="small"
                        placeholder="Search students..."
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <Grid container spacing={2}>
                      {classmates.map((student) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={student.id}>
                          <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                            <Avatar
                              sx={{ 
                                width: 60, 
                                height: 60, 
                                margin: '0 auto',
                                backgroundColor: 'primary.main',
                              }}
                            >
                              {student.name[0]}
                            </Avatar>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>
                              {student.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {student.rollNo}
                            </Typography>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Grid>

        {/* SIDEBAR */}
        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack spacing={3}>
            {/* Course Progress */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Course Progress
                </Typography>
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={courseProgress} 
                      size={120}
                      thickness={5}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {courseProgress}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    15 of 22 lessons completed
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={courseProgress} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Upcoming Deadlines
                </Typography>
                <List dense>
                  {courseAssignments.slice(0, 3).map((assignment) => (
                    <ListItem key={assignment.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: 'warning.main' }}>
                          <Assignment />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={assignment.title}
                        secondary={getCountdown(assignment.dueDate)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recent Activity
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                        <CheckCircle fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Assignment submitted"
                      secondary="2 hours ago"
                      primaryTypographyProps={{ variant: 'caption' }}
                      secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'info.main', width: 32, height: 32 }}>
                        <Campaign fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="New announcement"
                      secondary="1 day ago"
                      primaryTypographyProps={{ variant: 'caption' }}
                      secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'primary.main', width: 32, height: 32 }}>
                        <EmojiEvents fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Quiz completed"
                      secondary="3 days ago"
                      primaryTypographyProps={{ variant: 'caption' }}
                      secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Course Resources */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Links
                </Typography>
                <Stack spacing={1}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<CloudDownload />}
                    size="small"
                    onClick={() => window.open(`/resources/syllabus-${course.code}.pdf`, '_blank')}
                  >
                    Course Syllabus
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Schedule />}
                    size="small"
                    onClick={() => navigate('/student/timetable')}
                  >
                    Class Schedule
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Help />}
                    size="small"
                    onClick={() => navigate('/help-support')}
                  >
                    Help & Support
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
    </motion.div>
  );
};

export default CourseClassroom;
