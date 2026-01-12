import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Person, Schedule, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { courses } from '../../data/dummyData';
import PageHeader from '../../components/Common/PageHeader';
import { GridSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const CourseList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="My Courses"
          subtitle="Loading your courses..."
        />
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

      <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
        {courses.map((course) => (
          <Grid size={{ xs: 12, md: 6 }} key={course.id} component={motion.div} variants={fadeInUp}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                },
              }}
              onClick={() => navigate(`/lms/course/${course.id}`)}
            >
              <CardMedia
                component="img"
                height="160"
                image={course.coverImage}
                alt={course.title}
                sx={{
                  filter: 'brightness(0.8)',
                }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Chip
                    label={course.code}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Chip
                    label={`${course.credits} Credits`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {course.title}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar
                    src={course.instructorPhoto}
                    alt={course.instructor}
                    sx={{ width: 32, height: 32 }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight="500">
                      {course.instructor}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Course Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {course.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={course.progress}
                    sx={{ height: 8, borderRadius: '4px' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {course.schedule}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <People fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {course.enrolled} students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>    </motion.div>  );
};

export default CourseList;
