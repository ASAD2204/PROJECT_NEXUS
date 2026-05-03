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
import { teacherAPI } from '../../api/teacher';
import { lmsAPI } from '../../api/lms';

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

const buildDateTime = (dateValue, timeValue) => {
  if (!dateValue) {
    return null;
  }

  const timePart = timeValue && String(timeValue).includes(':') ? `${timeValue.length === 5 ? ':00' : ''}` : ':00:00';
  return `${dateValue}T${timeValue || '00:00'}${timePart && timeValue && timeValue.length === 5 ? ':00' : ''}`;
};

const CreateAssignment = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

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
    const fetchData = async () => {
      try {
        const cRes = await teacherAPI.getMyCourses();
        const crs = cRes.data?.courses || cRes.data || [];
        const normalizedCourses = (Array.isArray(crs) ? crs : []).map((course) => ({
          sectionId: course.section_id ?? course.id,
          courseId: course.course_id ?? course.course?.course_id ?? null,
          code: safeText(course.course?.code || course.code || course.course_code || `SEC-${course.section_id ?? course.id}`),
          name: safeText(course.course?.title || course.name || course.title || `Section ${course.section_id ?? course.id}`),
          room: safeText(course.room_no, 'TBA'),
        }));
        setCourses(normalizedCourses);

        if (isEdit) {
          const aRes = await lmsAPI.getAssignment(id);
          const a = aRes.data;
          setFormData({
            title: a.title,
            course: String(a.section_id),
            description: a.description,
            dueDate: a.due_date ? a.due_date.split('T')[0] : '',
            dueTime: a.due_date ? a.due_date.split('T')[1]?.substring(0, 5) : '',
            totalMarks: a.total_marks,
            instructions: a.instructions || '',
            attachments: [], // Existing attachments not easily editable here without more logic
          });
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, [id, isEdit]);

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleFilesChange = (files) => {
    setFormData({ ...formData, attachments: files });
  };

  const handleSubmit = async () => {
    try {
      const selectedCourse = courses.find((course) => String(course.sectionId) === String(formData.course));
      if (!selectedCourse) {
        throw new Error('Please select a valid section');
      }

      let attachmentRefId = null;
      if (formData.attachments.length > 0) {
        const uploadedFile = formData.attachments[0];
        const uploadFormData = new FormData();
        uploadFormData.append('title', `${formData.title} resource`);
        uploadFormData.append('description', formData.description || 'Assignment attachment');
        uploadFormData.append('material_type', uploadedFile.type || 'document');
        uploadFormData.append('uploaded_file', uploadedFile);
        const uploadRes = await lmsAPI.uploadMaterial(selectedCourse.courseId || selectedCourse.sectionId, uploadFormData);
        attachmentRefId = uploadRes.data?.file_ref_id || uploadRes.data?.material_id || null;
      }

      const payload = {
        section_id: Number(formData.course),
        title: formData.title,
        description: formData.description,
        total_marks: toFiniteNumber(formData.totalMarks, 10),
        due_date: buildDateTime(formData.dueDate, formData.dueTime),
        attachment_ref_id: attachmentRefId,
      };

      if (isEdit) {
        await lmsAPI.updateAssignment(id, payload);
      } else {
        await lmsAPI.createAssignment(payload);
      }
      navigate('/teacher/assignments');
    } catch (e) { 
      console.error('Failed to save assignment', e); 
      alert('Failed to save assignment. Please check all fields.');
    }
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={Assignment}
        title={isEdit ? "Edit Assignment" : "Create New Assignment"}
        subtitle={isEdit ? "Update assignment details and requirements" : "Design and publish assignments for your courses"}
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
                        <MenuItem key={course.sectionId} value={String(course.sectionId)}>
                          {course.code} - {course.name}{course.room ? ` • ${course.room}` : ''}
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
                  {isEdit ? "Update Assignment" : "Publish Assignment"}
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
