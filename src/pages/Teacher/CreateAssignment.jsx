import { useState } from 'react';
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

const CreateAssignment = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    course: '',
    description: '',
    dueDate: '',
    totalMarks: 100,
    instructions: '',
    attachments: [],
  });

  const courses = [
    { id: 1, code: 'CS-401', name: 'Database Systems' },
    { id: 2, code: 'CS-302', name: 'Data Structures & Algorithms' },
    { id: 3, code: 'CS-501', name: 'Web Development' },
    { id: 4, code: 'CS-403', name: 'Computer Networks' },
  ];

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleFilesChange = (files) => {
    setFormData({ ...formData, attachments: files });
  };

  const handleSubmit = () => {
    console.log('Creating assignment:', formData);
    // Here you would call API to create assignment
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
                <Grid size={{ xs: 12, md: 6 }}>
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

                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Total Marks *</FormLabel>
                    <TextField
                      fullWidth
                      type="number"
                      value={formData.totalMarks}
                      onChange={handleChange('totalMarks')}
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
              </Grid>

              <Divider />

              {/* Description */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Short Description *</FormLabel>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Brief overview of the assignment"
                  value={formData.description}
                  onChange={handleChange('description')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <Description color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </FormControl>

              {/* Detailed Instructions */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Detailed Instructions</FormLabel>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Provide detailed instructions, requirements, and guidelines for students..."
                  value={formData.instructions}
                  onChange={handleChange('instructions')}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      fontFamily: 'monospace',
                    } 
                  }}
                />
              </FormControl>

              <Divider />

              {/* Attachments */}
              <FormControl fullWidth>
                <FormLabel sx={{ mb: 2, fontWeight: 600 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AttachFile />
                    <span>Attachments (Optional)</span>
                  </Stack>
                </FormLabel>
                <FileDropzone 
                  onFilesChange={handleFilesChange}
                  maxFiles={5}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Upload reference materials, datasets, or any supporting documents
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
