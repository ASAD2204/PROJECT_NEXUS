import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Download, School, TrendingUp, Stars, AssignmentTurnedIn, EmojiEvents } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { transcript } from '../../data/dummyData';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { Button } from '@mui/material';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';

const Transcript = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(timer);
  }, []);

  const calculateTotalCredits = () => {
    return transcript.reduce(
      (total, sem) => total + sem.courses.reduce((sum, c) => sum + c.credits, 0),
      0
    );
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Academic Transcript"
          subtitle="Complete record of your academic performance"
        />
        <TableSkeleton rows={8} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <PageHeader
        title="Academic Transcript"
        subtitle="Complete record of your academic performance"
        action={
          <Button variant="contained" startIcon={<Download />}>
            Download PDF
          </Button>
        }
      />

      {/* Academic Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="CGPA"
            value={user?.cgpa || "3.85"}
            icon={TrendingUp}
            color="primary"
            subtitle="Out of 4.0"
            tooltip="Your Cumulative Grade Point Average across all completed semesters. This reflects your overall academic performance."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Credits"
            value={calculateTotalCredits()}
            icon={School}
            color="success"
            subtitle="Credits earned"
            tooltip="Total credit hours you have successfully completed towards your degree requirement."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Semesters"
            value={transcript.length}
            icon={AssignmentTurnedIn}
            color="info"
            subtitle="Completed"
            tooltip="Number of academic semesters you have completed so far in your degree program."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Highest GPA"
            value={Math.max(...transcript.map(s => parseFloat(s.semesterGPA))).toFixed(2)}
            icon={EmojiEvents}
            color="warning"
            subtitle="Best semester"
            tooltip="Your highest semester GPA achieved during your academic journey."
          />
        </Grid>
      </Grid>

      {/* Student Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Student Name
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {user?.name}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Roll Number
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {user?.rollNo}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Program
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {user?.program}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Cumulative GPA
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {user?.cgpa}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Semester-wise Transcript */}
      {transcript.map((semester) => (
        <Card key={semester.semester} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Semester {semester.semester}
              </Typography>
              <Chip
                label={`GPA: ${semester.semesterGPA}`}
                color="primary"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Course Code</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Course Title</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Credits</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Grade</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Grade Points</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {semester.courses.map((course, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{course.code}</TableCell>
                      <TableCell>{course.title}</TableCell>
                      <TableCell align="center">{course.credits}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={course.grade}
                          size="small"
                          color={
                            course.grade.startsWith('A')
                              ? 'success'
                              : course.grade.startsWith('B')
                              ? 'primary'
                              : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell align="center">{course.gradePoints.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2}>
                      <strong>Semester Total</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>
                        {semester.courses.reduce((sum, c) => sum + c.credits, 0)}
                      </strong>
                    </TableCell>
                    <TableCell colSpan={2} align="right">
                      <strong>Semester GPA: {semester.semesterGPA}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}

      {/* Summary Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Academic Summary
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'primary.main', borderRadius: '12px', color: 'white' }}>
                <School sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {user?.cgpa}
                </Typography>
                <Typography variant="body2">Cumulative GPA</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'secondary.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {calculateTotalCredits()}
                </Typography>
                <Typography variant="body2">Total Credits Earned</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'success.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {transcript.length}
                </Typography>
                <Typography variant="body2">Semesters Completed</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'info.main', borderRadius: '12px', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {user?.semester}
                </Typography>
                <Typography variant="body2">Current Semester</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
    </motion.div>
  );
};

export default Transcript;
