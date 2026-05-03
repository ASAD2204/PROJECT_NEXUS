import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Person, 
  Schedule, 
  People, 
  Search, 
  FilterList, 
  Sort, 
  ViewModule, 
  ViewList,
  School,
  AutoStories,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { sisAPI } from '../../api/sis';
import PageHeader from '../../components/Common/PageHeader';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const normalizeCourse = (course = {}) => {
  const code = course.course_code || course.code || course.section_code || course.sectionCode || 'COURSE';
  const title = course.course_title || course.title || course.name || `Section ${course.section_id || course.id || ''}`.trim();
  const instructor = course.instructor_name || course.instructor || course.faculty_name || 'Instructor';
  return {
    id: course.section_id || course.id,
    code,
    title,
    instructor,
    instructorPhoto: course.instructorPhoto || course.instructor_photo || course.faculty_photo || null,
    coverImage: course.coverImage || course.cover_image || course.banner_image || course.image_url || '',
    credits: course.credits ?? course.credit_hours ?? course.creditHours ?? 0,
    progress: Number(course.progress ?? course.progress_percentage ?? 0),
    schedule: course.schedule || course.meeting_time || 'TBA',
    enrolled: course.enrolled ?? course.enrolled_students ?? 0,
    department: course.department_name || course.department || 'Academic Department',
    semester: course.semester_name || course.semester || '',
  };
};

const CourseList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('title');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await sisAPI.getMyCourses();
        const rows = res.data?.courses || res.data || [];
        setCourses((Array.isArray(rows) ? rows : []).map(normalizeCourse));
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses
    .filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      return 0;
    });

  if (loading) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader title="My Courses" subtitle="Loading your academic dashboard..." />
        <GridSkeleton items={6} columns={{ xs: 12, md: 6 }} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <PageHeader
        title="My Courses"
        subtitle={`You are enrolled in ${courses.length} courses this semester`}
      />

      {/* SEARCH AND FILTERS */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search by name, code or instructor..."
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                  startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} fontSize="small" />}
                >
                  <MenuItem value="title">Course Title</MenuItem>
                  <MenuItem value="code">Course Code</MenuItem>
                  <MenuItem value="progress">Completion</MenuItem>
                </Select>
              </FormControl>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, v) => v && setViewMode(v)}
                size="small"
              >
                <ToggleButton value="grid"><ViewModule /></ToggleButton>
                <ToggleButton value="list"><ViewList /></ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* COURSE GRID */}
      <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
        <AnimatePresence mode="popLayout">
          {filteredCourses.map((course) => (
            <Grid 
              size={viewMode === 'grid' ? { xs: 12, md: 6, lg: 4 } : { xs: 12 }} 
              key={course.id} 
              component={motion.div} 
              variants={fadeInUp}
              layout
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: viewMode === 'grid' ? 'column' : 'row',
                  overflow: 'hidden',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => navigate(`/lms/course/${course.id}`)}
              >
                <Box sx={{ 
                  position: 'relative', 
                  width: viewMode === 'grid' ? '100%' : { xs: '100%', sm: 240 },
                  height: viewMode === 'grid' ? 180 : 'auto',
                  flexShrink: 0
                }}>
                  <CardMedia
                    component="img"
                    image={course.coverImage || `https://source.unsplash.com/random/800x600?education,${course.id}`}
                    alt={course.title}
                    sx={{
                      height: '100%',
                      width: '100%',
                      objectFit: 'cover',
                      backgroundColor: 'grey.900',
                    }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1 }}>
                    <Chip label={course.code} color="primary" size="small" sx={{ fontWeight: 800, backdropFilter: 'blur(4px)', bgcolor: 'rgba(25, 118, 210, 0.9)' }} />
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                     <Typography variant="caption" sx={{ color: 'white', opacity: 0.9, fontWeight: 600 }}>
                        {course.department}
                     </Typography>
                  </Box>
                </Box>

                <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom sx={{ 
                    lineHeight: 1.2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.4em'
                  }}>
                    {course.title}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Avatar
                      src={course.instructorPhoto}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}
                    >
                      {course.instructor?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {course.instructor}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Course Faculty
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        COMPLETION
                      </Typography>
                      <Typography variant="caption" fontWeight={800} color="primary.main">
                        {course.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={course.progress}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { borderRadius: 4 }
                      }}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={2}>
                      <Tooltip title="Enrolled Students">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <People fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight={600}>{course.enrolled}</Typography>
                        </Stack>
                      </Tooltip>
                      <Tooltip title="Credit Hours">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <School fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight={600}>{course.credits} Cr</Typography>
                        </Stack>
                      </Tooltip>
                    </Stack>
                    <Button variant="text" size="small" endIcon={<AutoStories />} sx={{ fontWeight: 700 }}>
                      Enter
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </AnimatePresence>
      </Grid>
      
      {filteredCourses.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <AutoStories sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" fontWeight={700}>
            No courses found matching your search.
          </Typography>
          <Button onClick={() => setSearchQuery('')} sx={{ mt: 2 }}>Clear Search</Button>
        </Box>
      )}
    </Box>
    </motion.div>
  );
};

export default CourseList;
