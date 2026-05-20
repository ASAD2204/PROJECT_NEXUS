import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Divider,
  Chip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Quiz as QuizIcon,
  Add,
  Delete,
  ArrowBack,
  Save,
  Publish,
  CheckCircle,
  RadioButtonChecked,
  TextFields,
  HelpOutline,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { fadeInUp } from '../../utils/animations';
import { teacherAPI } from '../../api/teacher';
import { lmsAPI } from '../../api/lms';

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const buildDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  return `${dateValue}T${timeValue.length === 5 ? `${timeValue}:00` : timeValue}`;
};

const normalizeQuestionForEditor = (question) => ({
  id: question?.question_id ?? question?.id ?? Date.now(),
  type: (question?.question_type || question?.questionType || 'mcq').toLowerCase(),
  question: question?.text || question?.question || '',
  marks: question?.marks ?? 1,
  options: Array.isArray(question?.options) ? question.options : [],
  correctAnswer: question?.correct_answer ?? question?.correctAnswer ?? '',
  explanation: question?.explanation || '',
});

const serializeQuestionForApi = (question) => ({
  text: safeText(question.question, 'Untitled Question'),
  question_type: safeText(question.type, 'mcq').toUpperCase(),
  marks: toFiniteNumber(question.marks, 1),
  correct_answer: Array.isArray(question.correctAnswer)
    ? question.correctAnswer.map((value) => safeText(value)).filter(Boolean).join(',')
    : safeText(question.correctAnswer, ''),
  options: Array.isArray(question.options) ? question.options : [],
});

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [activeStep, setActiveStep] = useState(0);
  
  // Quiz basic info
  const [quizInfo, setQuizInfo] = useState({
    title: '',
    course: '',
    description: '',
    duration: 30,
    totalMarks: 0,
    passingMarks: 0,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    instructions: '',
    shuffleQuestions: true,
    showResults: true,
  });

  // Questions array
  const [questions, setQuestions] = useState([]);

  const steps = ['Quiz Details', 'Add Questions', 'Review & Publish'];

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cRes = await teacherAPI.getMyCourses();
        const crs = cRes.data?.courses || cRes.data || [];
        setCourses((Array.isArray(crs) ? crs : []).map((course) => {
          const courseId = course.course_id ?? course.course?.course_id ?? course.section_id ?? course.id;
          return {
            value: String(courseId),
            sectionId: course.section_id ?? course.id,
            courseId: courseId,
            label: `${safeText(course.course?.code || course.code || `SEC-${course.section_id ?? course.id}`)} - ${safeText(course.course?.title || course.name || course.title || 'Untitled Course')}`,
          };
        }));

        if (isEdit) {
          const qRes = await lmsAPI.getQuiz(id);
          const q = qRes.data;
          setQuizInfo({
            title: q.title,
            course: String(q.course_id || q.section_id || ''),
            description: q.description || '',
            duration: q.duration_minutes,
            totalMarks: q.total_marks || 0,
            passingMarks: q.passing_marks || 0,
            startDate: q.start_time ? q.start_time.split('T')[0] : '',
            startTime: q.start_time ? q.start_time.split('T')[1]?.substring(0, 5) : '',
            endDate: q.end_time ? q.end_time.split('T')[0] : '',
            endTime: q.end_time ? q.end_time.split('T')[1]?.substring(0, 5) : '',
            instructions: q.instructions || '',
            shuffleQuestions: q.shuffle_questions || false,
            showResults: q.show_results || false,
          });
          setQuestions((q.questions || []).map(normalizeQuestionForEditor));
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, [id, isEdit]);

  const questionTypes = [
    { value: 'mcq', label: 'Multiple Choice (Single Answer)', icon: <RadioButtonChecked /> },
    { value: 'multiple', label: 'Multiple Choice (Multiple Answers)', icon: <CheckCircle /> },
    { value: 'truefalse', label: 'True/False', icon: <CheckCircle /> },
    { value: 'fillblank', label: 'Fill in the Blanks', icon: <TextFields /> },
    { value: 'short', label: 'Short Answer', icon: <HelpOutline /> },
  ];

  const handleQuizInfoChange = (field, value) => {
    setQuizInfo(prev => ({ ...prev, [field]: value }));
  };

  const addQuestion = (type) => {
    const newQuestion = {
      id: Date.now(),
      type,
      question: '',
      marks: 1,
      options: type === 'mcq' || type === 'multiple' ? ['', '', '', ''] : [],
      correctAnswer: type === 'mcq' ? 0 : type === 'truefalse' ? 'true' : type === 'multiple' ? [] : '',
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) }
        : q
    ));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const calculateTotalMarks = () => {
    return questions.reduce((sum, q) => sum + toFiniteNumber(q.marks, 0), 0);
  };

  const buildQuizPayload = (status) => ({
    course_id: toFiniteNumber(quizInfo.course, 0),
    title: quizInfo.title.trim(),
    duration_minutes: toFiniteNumber(quizInfo.duration, 30),
    start_time: buildDateTime(quizInfo.startDate, quizInfo.startTime),
    end_time: buildDateTime(quizInfo.endDate, quizInfo.endTime),
    questions: questions.map(serializeQuestionForApi),
    status,
    instructions: quizInfo.instructions,
    shuffle_questions: quizInfo.shuffleQuestions,
    show_results: quizInfo.showResults,
    passing_marks: toFiniteNumber(quizInfo.passingMarks, 0),
    total_marks: calculateTotalMarks(),
  });

  const hasValidScheduleWindow = () => {
    const hasStartPair = Boolean(quizInfo.startDate) && Boolean(quizInfo.startTime);
    const hasEndPair = Boolean(quizInfo.endDate) && Boolean(quizInfo.endTime);

    if (!hasStartPair && !hasEndPair) return true;
    if (!hasStartPair || !hasEndPair) return false;

    const start = new Date(`${quizInfo.startDate}T${quizInfo.startTime}:00`);
    const end = new Date(`${quizInfo.endDate}T${quizInfo.endTime}:00`);
    return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start;
  };

  const handleSaveDraft = async () => {
    try {
      if (isEdit) {
        await lmsAPI.updateQuiz(id, buildQuizPayload('draft'));
      } else {
        await lmsAPI.createQuiz(buildQuizPayload('draft'));
      }
      navigate('/teacher/quizzes');
    } catch (e) { console.error(e); }
  };

  const handlePublish = async () => {
    if (!quizInfo.title?.trim() || !quizInfo.course || questions.length === 0) {
      alert('Please fill all required fields and add at least one question');
      return;
    }
    if (!hasValidScheduleWindow()) {
      alert('Please provide a valid schedule window. End date/time must be after start date/time.');
      return;
    }
    try {
      if (isEdit) {
        await lmsAPI.updateQuiz(id, buildQuizPayload('active'));
      } else {
        await lmsAPI.createQuiz(buildQuizPayload('active'));
      }
      navigate('/teacher/quizzes');
    } catch (e) { console.error(e); }
  };

  const handleNext = () => {
    if (activeStep === 0 && (!quizInfo.title?.trim() || !quizInfo.course)) {
      alert('Please fill required fields: Title and Course');
      return;
    }
    if (activeStep === 0 && !hasValidScheduleWindow()) {
      alert('Please provide a valid schedule window. End date/time must be after start date/time.');
      return;
    }
    if (activeStep === 1 && questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const renderQuestionEditor = (question, index) => {
    return (
      <Card key={question.id} sx={{ mb: 3, borderRadius: 2 }} component={motion.div} {...fadeInUp}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip 
                label={`Question ${index + 1}`} 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={questionTypes.find(t => t.value === question.type)?.label}
                size="small"
              />
            </Stack>
            <IconButton color="error" onClick={() => deleteQuestion(question.id)}>
              <Delete />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 9 }}>
              <TextField
                fullWidth
                label="Question Text"
                multiline
                rows={2}
                value={question.question}
                onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                required
                placeholder="Enter your question here..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Marks"
                type="number"
                value={question.marks}
                onChange={(e) => updateQuestion(question.id, 'marks', e.target.value)}
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* MCQ Options */}
            {(question.type === 'mcq' || question.type === 'multiple') && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Options {question.type === 'multiple' && '(Select all correct answers)'}
                </Typography>
                {question.options.map((option, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {question.type === 'mcq' ? (
                      <Radio
                        checked={question.correctAnswer === idx}
                        onChange={() => updateQuestion(question.id, 'correctAnswer', idx)}
                      />
                    ) : (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={question.correctAnswer?.includes(idx) || false}
                            onChange={(e) => {
                              const current = question.correctAnswer || [];
                              const updated = e.target.checked
                                ? [...current, idx]
                                : current.filter(i => i !== idx);
                              updateQuestion(question.id, 'correctAnswer', updated);
                            }}
                          />
                        }
                        label=""
                      />
                    )}
                    <TextField
                      fullWidth
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={option}
                      onChange={(e) => updateOption(question.id, idx, e.target.value)}
                      size="small"
                    />
                  </Box>
                ))}
              </Grid>
            )}

            {/* True/False */}
            {question.type === 'truefalse' && (
              <Grid size={{ xs: 12 }}>
                <FormControl component="fieldset" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Correct Answer
                  </Typography>
                  <RadioGroup
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="True" />
                    <FormControlLabel value="false" control={<Radio />} label="False" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            )}

            {/* Fill in the Blanks */}
            {question.type === 'fillblank' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Correct Answer"
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                  placeholder="Enter the correct answer"
                  helperText="For multiple blanks, separate answers with commas"
                  sx={{ mt: 2 }}
                />
              </Grid>
            )}

            {/* Short Answer */}
            {question.type === 'short' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Sample Answer / Keywords"
                  multiline
                  rows={2}
                  value={question.correctAnswer}
                  onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                  placeholder="Enter keywords or sample answer for reference"
                  helperText="This helps in manual grading"
                  sx={{ mt: 2 }}
                />
              </Grid>
            )}

            {/* Explanation */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Explanation (Optional)"
                multiline
                rows={2}
                value={question.explanation}
                onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                placeholder="Explain the correct answer..."
                helperText="Students will see this after submitting"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <PageHeader
          icon={QuizIcon}
          title={isEdit ? "Edit Quiz" : "Create New Quiz"}
          subtitle={isEdit ? "Update quiz questions and configuration" : "Design comprehensive quizzes with multiple question types"}
        />
        <Button
          startIcon={<ArrowBack />}
          variant="outlined"
          onClick={() => navigate('/teacher/quizzes')}
        >
          Back to Quizzes
        </Button>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step 1: Quiz Details */}
      {activeStep === 0 && (
        <Card component={motion.div} {...fadeInUp}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Quiz Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  label="Quiz Title"
                  required
                  value={quizInfo.title}
                  onChange={(e) => handleQuizInfoChange('title', e.target.value)}
                  placeholder="e.g., Data Structures Fundamentals Quiz"
                  inputProps={{ minLength: 3, maxLength: 180 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={quizInfo.course}
                    onChange={(e) => handleQuizInfoChange('course', e.target.value)}
                    label="Course"
                  >
                    {courses.map(course => (
                      <MenuItem key={course.value} value={course.value}>
                        {course.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={quizInfo.description}
                  onChange={(e) => handleQuizInfoChange('description', e.target.value)}
                  placeholder="Brief description of the quiz content and objectives..."
                  inputProps={{ maxLength: 1000 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  required
                  value={quizInfo.duration}
                  onChange={(e) => handleQuizInfoChange('duration', e.target.value)}
                  inputProps={{ min: 5, max: 300 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Passing Marks"
                  type="number"
                  value={quizInfo.passingMarks}
                  onChange={(e) => handleQuizInfoChange('passingMarks', e.target.value)}
                  inputProps={{ min: 0, max: 1000 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Total Marks"
                  type="number"
                  value={calculateTotalMarks()}
                  disabled
                  helperText="Calculated from questions"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={quizInfo.startDate}
                  onChange={(e) => handleQuizInfoChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  value={quizInfo.startTime}
                  onChange={(e) => handleQuizInfoChange('startTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={quizInfo.endDate}
                  onChange={(e) => handleQuizInfoChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="time"
                  value={quizInfo.endTime}
                  onChange={(e) => handleQuizInfoChange('endTime', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Instructions for Students"
                  multiline
                  rows={4}
                  value={quizInfo.instructions}
                  onChange={(e) => handleQuizInfoChange('instructions', e.target.value)}
                  placeholder="Important instructions and guidelines for students..."
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizInfo.shuffleQuestions}
                      onChange={(e) => handleQuizInfoChange('shuffleQuestions', e.target.checked)}
                    />
                  }
                  label="Shuffle Questions"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizInfo.showResults}
                      onChange={(e) => handleQuizInfoChange('showResults', e.target.checked)}
                    />
                  }
                  label="Show Results Immediately"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add Questions */}
      {activeStep === 1 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Add Questions
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select a question type to add to your quiz
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {questionTypes.map(type => (
                  <Button
                    key={type.value}
                    variant="outlined"
                    startIcon={type.icon}
                    onClick={() => addQuestion(type.value)}
                    size="small"
                  >
                    {type.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {questions.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <QuizIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No questions added yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on a question type above to start building your quiz
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                Total Questions: <strong>{questions.length}</strong> | Total Marks: <strong>{calculateTotalMarks()}</strong>
              </Alert>
              {questions.map((question, index) => renderQuestionEditor(question, index))}
            </>
          )}
        </>
      )}

      {/* Step 3: Review & Publish */}
      {activeStep === 2 && (
        <Card component={motion.div} {...fadeInUp}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Review Quiz
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quiz Title
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {quizInfo.title || 'Untitled Quiz'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Course
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {courses.find(c => c.value === quizInfo.course)?.label || 'Not selected'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Total Questions
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {questions.length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Total Marks
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {calculateTotalMarks()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Duration
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {quizInfo.duration}m
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Passing Marks
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {quizInfo.passingMarks}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="success">
                  Your quiz is ready to publish! Review the details above and click Publish to make it available to students.
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            justifyContent="space-between"
            sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ order: { xs: 3, sm: 1 } }}
            >
              Back
            </Button>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1.5}
              sx={{ order: { xs: 1, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<Save />}
                onClick={handleSaveDraft}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Save as Draft
              </Button>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleNext}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Publish />}
                  onClick={handlePublish}
                  color="success"
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Publish Quiz
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateQuiz;
