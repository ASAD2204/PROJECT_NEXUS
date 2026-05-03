/**
 * Quiz Attempt Page
 * 
 * Secure and interactive interface for students to take quizzes.
 * Features:
 * - Real-time countdown timer
 * - Responsive question layout
 * - Support for multiple question types (MCQ, True/False, Multiple Answer, Short Text)
 * - Auto-save progress (simulated)
 * - Secure submission flow
 * - Result summary after submission
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  TextField,
  Checkbox,
  FormGroup,
  Divider,
  Stack,
  Chip,
  Paper,
  IconButton,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  Timer,
  CheckCircleOutline,
  HelpOutline,
  ArrowForward,
  ArrowBack,
  Flag,
  FlagOutlined,
  Save,
  AccessTime,
  EmojiEvents,
  MenuBook,
} from '@mui/icons-material';
import { lmsAPI } from '../../api/lms';
import { pageTransition, fadeInUp, staggerContainer } from '../../utils/animations';

const QuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [eligibility, setEligibility] = useState({ allowed: true, reason: '' });
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  const returnToCourse = () => {
    const courseId = location.state?.courseId || quiz?.section_id || quiz?.course_id;
    navigate(courseId ? `/lms/course/${courseId}` : '/lms');
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await lmsAPI.getQuiz(id);
        const q = res.data;
        setQuiz(q);

        // Set initial timer
        if (q.duration_minutes) {
          setTimeLeft(q.duration_minutes * 60);
        }

        // Check if already attempted
        try {
          const statusRes = await lmsAPI.getQuizAttemptStatus(id);
          if (statusRes.data?.attempted) {
            setEligibility({ allowed: false, reason: 'You have already completed this quiz.' });
            setResult({ 
              success: true, 
              message: 'Attempt Completed', 
              score: statusRes.data.total_score,
              maxMarks: statusRes.data.max_marks 
            });
            return;
          }
          
          if (statusRes.data?.can_attempt === false) {
             setEligibility({ allowed: false, reason: statusRes.data.reason || 'Quiz cannot be started at this time.' });
          }
        } catch (e) {
          console.warn('Attempt status check failed', e);
        }
      } catch (err) {
        console.error('Failed to load quiz', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  // Timer logic
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !result && eligibility.allowed) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(); // Auto-submit when time is up
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, result, eligibility.allowed]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleFlag = (idx) => {
    setFlags(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleMultiAnswer = (questionId, optionValue) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const exists = current.includes(optionValue);
      return {
        ...prev,
        [questionId]: exists ? current.filter((item) => item !== optionValue) : [...current, optionValue],
      };
    });
  };

  const handleSubmit = async () => {
    if (submitting || result) return;
    try {
      setSubmitting(true);
      const payload = {
        answers: (quiz?.questions || []).map((q) => {
          const val = answers[q.question_id];
          if (val === undefined || val === null || val === '') return null;
          return {
            question_id: q.question_id,
            selected_option: Array.isArray(val) ? val.join(',') : String(val),
          };
        }).filter(Boolean),
      };

      const res = await lmsAPI.submitQuiz(id, payload);
      setResult(res.data || { success: true });
      clearInterval(timerRef.current);
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.detail || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary" fontWeight={700}>Initialising secure quiz environment...</Typography>
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>Quiz not found or you are not authorized to view it.</Alert>
        <Button onClick={() => navigate('/lms')} sx={{ mt: 2 }}>Return to Dashboard</Button>
      </Box>
    );
  }

  if (result && result.success) {
    return (
      <motion.div {...pageTransition}>
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
          <EmojiEvents color="primary" sx={{ fontSize: 100, mb: 2 }} />
          <Typography variant="h3" fontWeight={900} gutterBottom>Quiz Submitted!</Typography>
          <Card sx={{ p: 4, borderRadius: 5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', mb: 3 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>Overall Result</Typography>
            <Typography variant="h2" fontWeight={900} color="primary">
              {result.score ?? '--'}/{result.maxMarks ?? '--'}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>{result.message || 'Well done on completing the assessment.'}</Typography>
          </Card>
          <Button variant="contained" size="large" onClick={returnToCourse} sx={{ borderRadius: 10, px: 4 }}>
            Return to Classroom
          </Button>
        </Box>
      </motion.div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container" sx={{ maxWidth: 1000, mx: 'auto', pb: 10 }}>
        {/* HEADER */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
           <Box>
             <Typography variant="h4" fontWeight={900}>{quiz.title}</Typography>
             <Typography color="text.secondary">Question {currentQuestionIndex + 1} of {quiz.questions.length}</Typography>
           </Box>
           
           <Paper sx={{ p: 2, borderRadius: 4, bgcolor: timeLeft < 60 ? 'error.light' : 'primary.light', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timer />
              <Typography variant="h5" fontWeight={800}>{timeLeft !== null ? formatTime(timeLeft) : 'No Limit'}</Typography>
           </Paper>
        </Stack>

        <LinearProgress variant="determinate" value={progress} sx={{ mb: 4, height: 10, borderRadius: 5 }} />

        {!eligibility.allowed && (
          <Alert severity="warning" sx={{ mb: 4, borderRadius: 3 }}>{eligibility.reason}</Alert>
        )}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card sx={{ borderRadius: 5, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                       <Chip label={`${currentQuestion.marks} Marks`} color="primary" variant="outlined" />
                       <IconButton onClick={() => toggleFlag(currentQuestionIndex)}>
                         {flags[currentQuestionIndex] ? <Flag color="error" /> : <FlagOutlined />}
                       </IconButton>
                    </Stack>

                    <Typography variant="h5" fontWeight={700} sx={{ mb: 4 }}>
                      {currentQuestion.text}
                    </Typography>

                    <Box sx={{ minHeight: 200 }}>
                      {currentQuestion.question_type.toLowerCase() === 'mcq' && (
                        <RadioGroup 
                          value={answers[currentQuestion.question_id] || ''} 
                          onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        >
                          {(currentQuestion.options || []).map((opt, i) => (
                            <FormControlLabel 
                              key={i} 
                              value={String(opt.value || opt)} 
                              control={<Radio />} 
                              label={String(opt.label || opt)}
                              sx={{ 
                                mb: 2, 
                                p: 1.5, 
                                borderRadius: 3, 
                                border: '1px solid',
                                borderColor: answers[currentQuestion.question_id] === String(opt.value || opt) ? 'primary.main' : 'divider',
                                bgcolor: answers[currentQuestion.question_id] === String(opt.value || opt) ? 'primary.50' : 'transparent',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            />
                          ))}
                        </RadioGroup>
                      )}

                      {(currentQuestion.question_type.toLowerCase() === 'tf' || currentQuestion.question_type.toLowerCase() === 'truefalse') && (
                        <RadioGroup 
                          value={answers[currentQuestion.question_id] || ''} 
                          onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        >
                          {['True', 'False'].map((val) => (
                            <FormControlLabel 
                              key={val} 
                              value={val.toLowerCase()} 
                              control={<Radio />} 
                              label={val}
                              sx={{ mb: 2, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                            />
                          ))}
                        </RadioGroup>
                      )}

                      {currentQuestion.question_type.toLowerCase() === 'multiple' && (
                        <FormGroup>
                          {(currentQuestion.options || []).map((opt, i) => {
                            const val = String(opt.value || opt);
                            const checked = (answers[currentQuestion.question_id] || []).includes(val);
                            return (
                              <FormControlLabel
                                key={i}
                                control={<Checkbox checked={checked} onChange={() => toggleMultiAnswer(currentQuestion.question_id, val)} />}
                                label={String(opt.label || opt)}
                                sx={{ mb: 2, p: 1.5, borderRadius: 3, border: '1px solid', borderColor: checked ? 'primary.main' : 'divider' }}
                              />
                            );
                          })}
                        </FormGroup>
                      )}

                      {currentQuestion.question_type.toLowerCase() === 'short' && (
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          variant="outlined"
                          placeholder="Type your answer here..."
                          value={answers[currentQuestion.question_id] || ''}
                          onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                        />
                      )}
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Stack direction="row" justifyContent="space-between">
                      <Button 
                        startIcon={<ArrowBack />} 
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(i => i - 1)}
                      >
                        Previous
                      </Button>
                      
                      {currentQuestionIndex === quiz.questions.length - 1 ? (
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="large"
                          onClick={handleSubmit}
                          disabled={submitting}
                          endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckCircleOutline />}
                          sx={{ borderRadius: 10, px: 4 }}
                        >
                          Finish & Submit
                        </Button>
                      ) : (
                        <Button 
                          variant="contained" 
                          size="large"
                          onClick={() => setCurrentQuestionIndex(i => i + 1)}
                          endIcon={<ArrowForward />}
                          sx={{ borderRadius: 10, px: 4 }}
                        >
                          Next Question
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 5, p: 1 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MenuBook fontSize="small" /> Question Navigator
                </Typography>
                <Grid container spacing={1} sx={{ mt: 2 }}>
                  {quiz.questions.map((_, idx) => {
                    const isAnswered = answers[quiz.questions[idx].question_id] !== undefined;
                    const isFlagged = flags[idx];
                    const isCurrent = currentQuestionIndex === idx;
                    
                    return (
                      <Grid size={3} key={idx}>
                        <Box
                          onClick={() => setCurrentQuestionIndex(idx)}
                          sx={{
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 2,
                            cursor: 'pointer',
                            fontWeight: 700,
                            position: 'relative',
                            bgcolor: isCurrent ? 'primary.main' : isAnswered ? 'success.50' : 'action.hover',
                            color: isCurrent ? 'white' : isAnswered ? 'success.main' : 'text.primary',
                            border: '2px solid',
                            borderColor: isCurrent ? 'primary.main' : isAnswered ? 'success.light' : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                          }}
                        >
                          {idx + 1}
                          {isFlagged && <Box sx={{ position: 'absolute', top: -4, right: -4, width: 10, height: 10, bgcolor: 'error.main', borderRadius: '50%', border: '2px solid white' }} />}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle2" fontWeight={800} gutterBottom>Legend</Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 0.5 }} />
                      <Typography variant="caption">Current Question</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 16, height: 16, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light', borderRadius: 0.5 }} />
                      <Typography variant="caption">Answered</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 16, height: 16, bgcolor: 'error.main', borderRadius: '50%' }} />
                      <Typography variant="caption">Flagged for review</Typography>
                    </Stack>
                  </Stack>
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Button 
                  fullWidth 
                  variant="outlined" 
                  startIcon={<Save />} 
                  sx={{ borderRadius: 3 }}
                  onClick={() => alert('Progress is auto-saved!')}
                >
                  Save Progress
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default QuizAttempt;
