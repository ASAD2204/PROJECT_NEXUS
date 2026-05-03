/**
 * Course Classroom Page
 * 
 * Detailed view of a specific course with all course materials and activities.
 * Central hub for course content, assignments, announcements, and resources.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Collapse,
  Grid,
} from '@mui/material';
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
  FolderOpen,
  InsertDriveFile,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { sisAPI } from '../../api/sis';
import { lmsAPI } from '../../api/lms';
import { opsAPI } from '../../api/ops';
import StatusBadge from '../../components/Common/StatusBadge';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const CourseClassroom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [postContent, setPostContent] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState(null);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const [course, setCourse] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [courseAnnouncements, setCourseAnnouncements] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [materials, setMaterials] = useState([]);

  const isFaculty = user?.role === 'teacher' || user?.role === 'faculty' || false;

  const normalizeAssignment = (assignment, submission = null) => {
    const dueDate = assignment?.dueDate || assignment?.due_date || null;
    const totalMarks = Number(assignment?.totalMarks ?? assignment?.total_marks ?? 0);
    const safeTotalMarks = isFinite(totalMarks) ? totalMarks : 0;
    const obtainedMarks = submission?.marksObtained ?? submission?.marks_obtained ?? assignment?.obtainedMarks ?? assignment?.obtained_marks ?? null;
    const submittedAt = submission?.submittedAt ?? submission?.submitted_at ?? assignment?.submittedAt ?? assignment?.submitted_at ?? null;
    const hasSubmission = Boolean(submittedAt || submission || assignment?.submission_status || assignment?.status === 'Submitted');
    const isGraded = obtainedMarks !== null && obtainedMarks !== undefined;
    const rawStatus = String(assignment?.status || assignment?.submission_status || '').toLowerCase();
    
    let status = 'Pending';
    if (isGraded || rawStatus === 'graded') status = 'Graded';
    else if (hasSubmission || rawStatus === 'submitted') status = 'Submitted';
    else if (rawStatus === 'overdue') status = 'Overdue';
    else if (dueDate && new Date(dueDate) < new Date()) status = 'Overdue';

    return {
      ...assignment,
      id: assignment?.id || assignment?.assignment_id,
      assignment_id: assignment?.assignment_id || assignment?.id,
      dueDate,
      due_date: dueDate,
      totalMarks: safeTotalMarks,
      total_marks: safeTotalMarks,
      obtainedMarks,
      obtained_marks: obtainedMarks,
      submittedAt,
      submitted_at: submittedAt,
      status,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const classroomRes = await lmsAPI.getClassroomDetails(id);
      const data = classroomRes.data;

      setCourse({
        ...data.course,
        section_id: data.section_id,
        faculty_id: data.faculty_id,
        faculty_name: data.faculty_name,
        faculty_email: data.faculty_email,
        room_no: data.room_no,
        enrolled_count: data.enrolled_count,
        progress: data.course?.progress ?? 0
      });
      
      let assignmentRows = (data.assignments || []).map((assignment) => normalizeAssignment(assignment));

      if (!isFaculty) {
        try {
          const submissionsRes = await lmsAPI.getMySubmissions();
          const submissions = Array.isArray(submissionsRes.data)
            ? submissionsRes.data
            : (submissionsRes.data?.submissions || []);
          const submissionMap = new Map(
            submissions.map((submission) => [String(submission.assignment_id || submission.assignmentId), submission])
          );
          assignmentRows = assignmentRows.map((assignment) => normalizeAssignment(
            assignment,
            submissionMap.get(String(assignment.assignment_id || assignment.id)) || null
          ));
        } catch (submissionError) {
          console.error('Failed to load student submissions:', submissionError);
        }
      }

      setCourseAssignments(assignmentRows);
      setCourseQuizzes(data.quizzes || []);
      setMaterials(data.materials || []);
      setParticipants(data.participants || []);

      const annRes = await lmsAPI.getCourseAnnouncements(id);
      const rawAnnouncements = annRes.data?.announcements || annRes.data || [];
      setCourseAnnouncements(rawAnnouncements.map(ann => ({
        ...ann,
        postedBy: ann.author_name || ann.postedBy || 'Anonymous',
        postedOn: ann.published_at || ann.postedOn || ann.created_at || null
      })));
    } catch (err) {
      console.error("Failed to fetch classroom data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, isFaculty]);

  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/lms')} sx={{ fontWeight: 700, mb: 2 }}>
          Back to Courses
        </Button>
        <GridSkeleton items={6} columns={{ xs: 12, md: 6 }} />
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/lms')} sx={{ mb: 2 }}>
          Back to Courses
        </Button>
        <Typography variant="h5">Course not found</Typography>
      </Box>
    );
  }

  const courseProgress = course?.progress || 0;
  const enrolledStudents = course?.enrolled_count || 0;

  const filteredAssignments = courseAssignments.filter(a => {
    if (assignmentFilter === 'all') return true;
    if (assignmentFilter === 'pending') return a.status === 'Pending';
    if (assignmentFilter === 'submitted') return a.status === 'Submitted';
    if (assignmentFilter === 'graded') return a.status === 'Graded';
    return true;
  });

  const gradeRows = [
    ...(courseAssignments || []).map((a) => ({
      name: a.title || 'Assignment',
      category: 'Assignment',
      earned: a.obtainedMarks ?? a.obtained_marks ?? a.marks_obtained,
      total: a.total_marks ?? a.totalMarks ?? 100,
      percentage: ((a.obtainedMarks ?? a.obtained_marks ?? a.marks_obtained) !== null && (a.total_marks ?? a.totalMarks)) 
        ? Math.round(((a.obtainedMarks ?? a.obtained_marks ?? a.marks_obtained) / (a.total_marks ?? a.totalMarks)) * 100) 
        : null,
    })),
    ...(courseQuizzes || []).map((q) => ({
      name: q.title || 'Quiz',
      category: 'Quiz',
      earned: q.score,
      total: q.total_marks ?? q.totalMarks ?? 100,
      percentage: (q.score !== null && (q.total_marks ?? q.totalMarks)) 
        ? Math.round((q.score / (q.total_marks ?? q.totalMarks)) * 100) 
        : null,
    })),
  ];

  const finalGrade = gradeRows.filter(r => r.percentage !== null).length
    ? Math.round(gradeRows.reduce((sum, g) => sum + (g.percentage || 0), 0) / gradeRows.filter(r => r.percentage !== null).length)
    : 0;

  const handleDownload = (m) => {
    const fileUrl = m.file_url || m.file_ref_id;
    if (!fileUrl) return;
    // We use the new dedicated download endpoint
    window.open(`/api/v1/lms/materials/download/${m.material_id}`, '_blank');
  };

  const getFileIcon = (type) => {
    const t = String(type).toLowerCase();
    if (t.includes('pdf')) return <PictureAsPdf color="error" />;
    if (t.includes('video') || t.includes('mp4')) return <VideoLibrary color="primary" />;
    if (t.includes('ppt') || t.includes('presentation')) return <Slideshow color="warning" />;
    if (t.includes('doc') || t.includes('word')) return <Article color="info" />;
    return <InsertDriveFile color="action" />;
  };

  const safeDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handlePostAnnouncement = async () => {
    if (!postContent.trim()) return;
    try {
      setPostingAnnouncement(true);
      await opsAPI.createAnnouncement({
        title: `Update - ${course.title}`,
        content: postContent,
        course_id: Number(id),
      });
      const annRes = await lmsAPI.getCourseAnnouncements(id);
      setCourseAnnouncements(annRes.data?.announcements || annRes.data || []);
      setPostContent('');
      setNewAnnouncement({ type: 'success', text: 'Announcement posted successfully!' });
    } catch (err) {
      setNewAnnouncement({ type: 'error', text: 'Failed to post announcement.' });
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleLike = async (aid) => {
    try {
      await lmsAPI.likeAnnouncement(aid);
      setCourseAnnouncements(prev => prev.map(a => 
        (a.id === aid || a.announcement_id === aid) ? { ...a, likes_count: (a.likes_count || 0) + 1 } : a
      ));
    } catch { /* skip */ }
  };

  const submitComment = async (aid) => {
    const text = (commentDrafts[aid] || '').trim();
    if (!text) return;
    try {
      await lmsAPI.createAnnouncementComment(aid, { comment: text });
      const annRes = await lmsAPI.getCourseAnnouncements(id);
      setCourseAnnouncements(annRes.data?.announcements || annRes.data || []);
      setCommentDrafts(prev => ({ ...prev, [aid]: '' }));
    } catch { /* skip */ }
  };

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/lms')} sx={{ fontWeight: 700 }}>
          Courses
        </Button>
        <Stack direction="row" spacing={1}>
           <IconButton color="primary"><Notifications /></IconButton>
           <IconButton color="primary"><Help /></IconButton>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={9}>
          <Card sx={{ mb: 4, overflow: 'hidden', borderRadius: 5 }}>
            <Box sx={{ 
              height: 240, 
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              position: 'relative'
            }}>
              <Box sx={{ position: 'absolute', bottom: 24, left: 24, color: 'white' }}>
                <Chip label={course.code || course.course_code} color="primary" sx={{ fontWeight: 800, mb: 1.5 }} />
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>{course.title}</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={course.instructorPhoto} sx={{ width: 32, height: 32 }} />
                  <Typography variant="subtitle1" fontWeight={600}>{course.faculty_name}</Typography>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
                <Tab label="Stream" icon={<Campaign />} iconPosition="start" />
                <Tab label="Assignments" icon={<Assignment />} iconPosition="start" />
                <Tab label="Quizzes" icon={<Quiz />} iconPosition="start" />
                <Tab label="Materials" icon={<FolderOpen />} iconPosition="start" />
                <Tab label="Grades" icon={<TrendingUp />} iconPosition="start" />
                <Tab label="Classmates" icon={<People />} iconPosition="start" />
              </Tabs>
            </Box>
          </Card>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {activeTab === 0 && (
                <Box>
                  <Card sx={{ mb: 3, borderRadius: 3 }}>
                    <CardContent>
                      <TextField fullWidth multiline rows={2} placeholder="Share with your class..." value={postContent} onChange={(e) => setPostContent(e.target.value)} sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" endIcon={<Send />} onClick={handlePostAnnouncement} disabled={!postContent.trim() || postingAnnouncement}>
                          Post
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                  <Stack spacing={2}>
                    {courseAnnouncements.map((ann) => {
                      const aid = ann.id || ann.announcement_id;
                      return (
                        <Card key={aid} sx={{ borderRadius: 3 }}>
                          <CardContent>
                            <Typography fontWeight={800}>{ann.postedBy}</Typography>
                            <Typography variant="caption" color="text.secondary">{safeDate(ann.postedOn)}</Typography>
                            <Typography sx={{ mt: 2 }}>{ann.content}</Typography>
                          </CardContent>
                          <Divider />
                          <CardActions>
                            <Button size="small" startIcon={<ThumbUp />} onClick={() => handleLike(aid)}>Like ({ann.likes_count || 0})</Button>
                            <Button size="small" startIcon={<Comment />} onClick={() => setExpandedComments(p => ({...p, [aid]: !p[aid]}))}>Comment</Button>
                          </CardActions>
                          <Collapse in={expandedComments[aid]}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                              {(ann.comments || []).map((c, i) => (
                                <Box key={i} sx={{ mb: 1 }}>
                                  <Typography variant="caption" fontWeight={800}>{c.author_name}</Typography>
                                  <Typography variant="body2">{c.comment}</Typography>
                                </Box>
                              ))}
                              <TextField fullWidth size="small" placeholder="Add comment..." value={commentDrafts[aid] || ''} onChange={(e) => setCommentDrafts(p => ({...p, [aid]: e.target.value}))} onKeyPress={(e) => e.key === 'Enter' && submitComment(aid)} />
                            </Box>
                          </Collapse>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {activeTab === 1 && (
                <Stack spacing={2}>
                  {filteredAssignments.map((a) => (
                    <Card key={a.id} sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={8}>
                            <Typography variant="h6" fontWeight={700}>{a.title}</Typography>
                            <Typography variant="caption" color="text.secondary">Due: {safeDate(a.dueDate)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <StatusBadge status={a.status} type="assignment" />
                              <Button variant="contained" size="small" onClick={() => navigate(`/lms/assignment/${a.id}`, { state: { courseId: id, assignment: a } })}>
                                {a.status === 'Graded' ? 'Review' : 'Open'}
                              </Button>
                            </Stack>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                       <Typography color="text.secondary">No assignments found.</Typography>
                    </Box>
                  )}
                </Stack>
              )}

              {activeTab === 2 && (
                <Grid container spacing={3}>
                  {courseQuizzes.map((q) => (
                    <Grid item xs={12} md={6} lg={4} key={q.quiz_id || q.id}>
                      <Card sx={{ height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Box sx={{ p: 1, bgcolor: q.attempted ? 'success.light' : 'secondary.light', borderRadius: 2, color: 'white' }}>
                              <Quiz />
                            </Box>
                            <Chip label={`${q.duration_minutes || 0}m`} size="small" variant="outlined" />
                          </Stack>
                          <Typography variant="h6" fontWeight={800} gutterBottom>{q.title}</Typography>
                          
                          <Stack spacing={1} sx={{ mt: 2 }}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">Status</Typography>
                              <Typography variant="caption" fontWeight={700} color={q.attempted ? 'success.main' : 'warning.main'}>
                                {q.attempted ? 'Attempted' : 'Pending'}
                              </Typography>
                            </Stack>
                            {q.attempted && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">Score</Typography>
                                <Typography variant="caption" fontWeight={900} color="primary.main">
                                  {q.score ?? 0} / {q.total_marks ?? 0}
                                </Typography>
                              </Stack>
                            )}
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">Deadline</Typography>
                              <Typography variant="caption" fontWeight={700}>{safeDate(q.end_time)}</Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                        <Divider />
                        <CardActions>
                          <Button 
                            fullWidth 
                            variant={q.attempted ? "outlined" : "contained"}
                            color={q.attempted ? "success" : "secondary"}
                            onClick={() => navigate(`/lms/quiz/${q.quiz_id}/attempt`)}
                          >
                            {q.attempted ? "View Result" : "Start Quiz"}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {activeTab === 3 && (
                <Grid container spacing={2}>
                  {materials.map((m) => (
                    <Grid item xs={12} sm={6} key={m.material_id || m.id}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <ListItem secondaryAction={<IconButton onClick={() => handleDownload(m)} color="primary"><CloudDownload /></IconButton>}>
                          <ListItemIcon>{getFileIcon(m.material_type || m.type)}</ListItemIcon>
                          <ListItemText primary={m.title} secondary={`${(m.material_type || m.type || 'Document').toUpperCase()} • ${safeDate(m.uploaded_at)}`} />
                        </ListItem>
                      </Card>
                    </Grid>
                  ))}
                  {materials.length === 0 && (
                    <Box sx={{ textAlign: 'center', width: '100%', py: 10 }}>
                      <FolderOpen sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">No materials uploaded yet.</Typography>
                    </Box>
                  )}
                </Grid>
              )}

              {activeTab === 4 && (
                <Box>
                  <Card sx={{ mb: 3, borderRadius: 3, bgcolor: 'primary.main', color: 'white', textAlign: 'center', p: 3 }}>
                    <Typography variant="h3" fontWeight={900}>{finalGrade}%</Typography>
                    <Typography>Overall Course Grade</Typography>
                  </Card>
                  <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Assessment</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>Score</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gradeRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell><Chip label={row.category} size="small" variant="outlined" /></TableCell>
                            <TableCell align="right">{row.earned !== null ? `${row.earned} / ${row.total}` : 'Pending'}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700} color={row.percentage !== null ? 'primary' : 'text.disabled'}>
                                {row.percentage !== null ? `${row.percentage}%` : '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {activeTab === 5 && (
                <Grid container spacing={2}>
                  {participants.map((p, i) => (
                    <Grid item xs={6} sm={4} md={3} key={i}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 2, borderRadius: 3 }}>
                        <Avatar sx={{ mx: 'auto', mb: 1 }}>{p.name?.[0]}</Avatar>
                        <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.roll_no}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </motion.div>
          </AnimatePresence>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Stack spacing={3}>
            <Card sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}>
              <Typography fontWeight={800}>Course Progress</Typography>
              <Box sx={{ my: 2, position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={courseProgress} size={80} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" fontWeight={900}>{courseProgress}%</Typography>
                </Box>
              </Box>
            </Card>
            <Card sx={{ borderRadius: 3, p: 2, bgcolor: 'grey.100' }}>
              <Typography variant="subtitle2" fontWeight={800}>Instructor</Typography>
              <Typography variant="body2">{course.faculty_name}</Typography>
              <Typography variant="caption">{course.faculty_email}</Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
    </motion.div>
  );
};

export default CourseClassroom;
