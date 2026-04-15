import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  useTheme,
  FormControl,
  FormLabel,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assignment,
  Save,
  CalendarToday,
  Description,
  Grade,
  AttachFile,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import FileDropzone from '../../components/Forms/FileDropzone';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { sisAPI } from '../../api/sis';
import { lmsAPI } from '../../api/lms';

const CreateAssignment = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    course: '',
    description: '',
    dueDate: '',
    dueTime: '',
    totalMarks: 10,
    instructions: '',
    attachments: [],
  });

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await sisAPI.getMyCourses();
        const crs = res.data?.courses || res.data || [];
        setCourses(crs.map(c => ({ id: c.id, code: c.code || c.id, name: c.name })));
      } catch (e) { console.error(e); }
    };
    fetchCourses();
  }, []);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleFilesChange = (files) => {
    setFormData({ ...formData, attachments: files });
  };

  const handleSubmit = async () => {
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'attachments') v.forEach(f => payload.append('files', f));
        else payload.append(k, v);
      });
      await lmsAPI.createAssignment(payload);
    } catch (e) { console.error('Failed to create assignment', e); }
    navigate('/teacher/courses');
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={Assignment}
        title="Create New Assignment"
        subtitle="Design and publish assignments for your courses"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />

      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Card
          component={motion.div}
          variants={fadeInUp}
          sx={{
            maxWidth: 900,
            mx: 'auto',
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
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Assignment Title */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Assignment Title *</FormLabel>
                <TextField
                  fullWidth
                  placeholder="e.g., Database Design Project"
                  value={formData.title}
                  onChange={handleChange('title')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Assignment color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </FormControl>

              {/* Course Selection */}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 12 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Course *</FormLabel>
                    <TextField
                      select
                      fullWidth
                      value={formData.course}
                      onChange={handleChange('course')}
                      placeholder="Select Course"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {courses.map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Total Marks *</FormLabel>
                    <TextField
                      fullWidth
                      type="number"
                      placeholder="e.g., 10 or 20"
                      value={formData.totalMarks}
                      onChange={handleChange('totalMarks')}
                      inputProps={{ min: 5, max: 100 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Grade color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Due Date *</FormLabel>
                    <TextField
                      fullWidth
                      type="date"
                      value={formData.dueDate}
                      onChange={handleChange('dueDate')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday color="primary" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Due Time *</FormLabel>
                    <TextField
                      fullWidth
                      type="time"
                      value={formData.dueTime}
                      onChange={handleChange('dueTime')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </FormControl>
                </Grid>
              </Grid>

              <Divider />

              {/* Description (Rich Text) */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>
                  Assignment Description (Instructions) *
                </FormLabel>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Provide detailed assignment instructions, requirements, objectives, and submission guidelines..."
                  value={formData.description}
                  onChange={handleChange('description')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <Description color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      fontSize: '0.95rem',
                    } 
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  📝 Provide clear instructions for students including objectives, requirements, and submission format
                </Typography>
              </FormControl>

              <Divider />

              {/* Attachments */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 2, fontWeight: 600 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AttachFile />
                    <span>File Attachment (Resource Material)</span>
                  </Stack>
                </FormLabel>
                <FileDropzone 
                  onFilesChange={handleFilesChange}
                  maxFiles={5}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  📎 Upload PDF/Doc files with reference materials, datasets, or supporting documents (Optional)
                </Typography>
              </FormControl>

              <Divider />

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/teacher/courses')}
                  sx={{
                    px: 4,
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 'bold',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={handleSubmit}
                  disabled={!formData.title || !formData.course || !formData.dueDate || !formData.description}
                  sx={{
                    px: 4,
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #654391 100%)',
                    },
                  }}
                >
                  Publish Assignment
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CreateAssignment;
