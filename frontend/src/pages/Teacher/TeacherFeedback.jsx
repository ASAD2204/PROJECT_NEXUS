import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Rating,
  Avatar,
  Divider,
  Chip,
  LinearProgress,
  Grid,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Feedback,
  Star,
  Person,
  School,
  TrendingUp,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { lmsAPI } from '../../api/lms';

const TeacherFeedback = () => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [summary, setFeedbackSummary] = useState(null);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoading(true);
        const [resFeedback, resSummary] = await Promise.all([
          lmsAPI.getCourseFeedback(courseId),
          lmsAPI.getFacultyFeedbackSummary(0) // 0 is placeholder for 'me' in some backends, or would use faculty_id
        ]);
        setFeedback(resFeedback.data || []);
        setFeedbackSummary(resSummary.data);
      } catch (err) {
        setError('Failed to load feedback data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) loadFeedback();
  }, [courseId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={4}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
          <Feedback fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">Student Feedback</Typography>
          <Typography variant="body2" color="text.secondary">Evaluations and comments from your students</Typography>
        </Box>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Average Rating</Typography>
                <Typography variant="h2" fontWeight="bold">{summary?.avg_rating || '0.0'}</Typography>
                <Rating value={summary?.avg_rating || 0} precision={0.1} readOnly sx={{ color: 'white', '& .MuiRating-iconEmpty': { color: 'rgba(255,255,255,0.3)' } }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">Total Reviews</Typography>
                <Typography variant="h2" fontWeight="bold">{summary?.total_reviews || 0}</Typography>
                <Typography variant="body2" color="success.main"><TrendingUp sx={{ fontSize: 16, mr: 0.5 }} /> Active Engagement</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight="bold" mb={2}>Recent Evaluations</Typography>
      <Stack spacing={2}>
        {feedback.length > 0 ? (
          feedback.map((item, index) => (
            <Paper key={index} sx={{ p: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'grey.200' }}>
                    <Person sx={{ color: 'grey.600' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.is_anonymous ? 'Anonymous Student' : (item.student_id ? `Student ${item.student_id}` : 'Student')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.submitted_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Stack>
                <Rating value={item.overall_rating} readOnly size="small" />
              </Stack>
              <Typography variant="body1" sx={{ fontStyle: item.comments ? 'normal' : 'italic', color: item.comments ? 'text.primary' : 'text.secondary' }}>
                {item.comments || "No written comments provided."}
              </Typography>
              {item.responses && (
                 <Box sx={{ mt: 2 }}>
                    {Object.entries(item.responses).map(([q, a], idx) => (
                       <Chip key={idx} label={`${q}: ${a}`} size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                 </Box>
              )}
            </Paper>
          ))
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <School sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography>No feedback has been submitted for this course yet.</Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default TeacherFeedback;
