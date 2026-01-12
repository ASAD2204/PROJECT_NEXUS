import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  Chip,
  IconButton,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Download,
  TrendingUp,
  People,
  School,
  Payment,
  Assessment,
  Print,
  Share,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import { pageTransition } from '../../utils/animations';

const AdminReports = () => {
  const theme = useTheme();
  const [reportType, setReportType] = useState('enrollment');
  const [semester, setSemester] = useState('fall2025');
  const [department, setDepartment] = useState('all');

  const reportTypes = [
    { value: 'enrollment', label: 'Enrollment Report' },
    { value: 'financial', label: 'Financial Report' },
    { value: 'academic', label: 'Academic Performance' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'faculty', label: 'Faculty Report' },
  ];

  const summaryStats = [
    { label: 'Total Students', value: '2,847', change: '+12.5%', color: theme.palette.primary.main },
    { label: 'Total Revenue', value: '₨ 48.5M', change: '+15.3%', color: theme.palette.success.main },
    { label: 'Avg Attendance', value: '87%', change: '+2.1%', color: theme.palette.info.main },
    { label: 'Course Completion', value: '94%', change: '+3.2%', color: theme.palette.warning.main },
  ];

  const enrollmentData = {
    labels: ['CS', 'Business', 'Engineering', 'Medical', 'Arts'],
    datasets: [
      {
        label: 'Students',
        data: [852, 743, 621, 431, 200],
        backgroundColor: theme.palette.primary.main,
      },
    ],
  };

  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue (Million PKR)',
        data: [6.5, 7.2, 6.8, 7.5, 8.1, 8.5],
        borderColor: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Generate comprehensive reports and insights"
        />

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    label="Report Type"
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    {reportTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={semester}
                    label="Semester"
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <MenuItem value="fall2025">Fall 2025</MenuItem>
                    <MenuItem value="spring2026">Spring 2026</MenuItem>
                    <MenuItem value="fall2024">Fall 2024</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={department}
                    label="Department"
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    <MenuItem value="cs">Computer Science</MenuItem>
                    <MenuItem value="bba">Business Admin</MenuItem>
                    <MenuItem value="eng">Engineering</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" startIcon={<Assessment />}>
                    Generate
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {summaryStats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                    {stat.value}
                  </Typography>
                  <Chip
                    label={stat.change}
                    size="small"
                    color="success"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Revenue Trend
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small">
                      <Print />
                    </IconButton>
                    <IconButton size="small">
                      <Download />
                    </IconButton>
                  </Stack>
                </Box>
                <Box sx={{ height: 300 }}>
                  <Line
                    data={revenueData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Department Enrollment
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={enrollmentData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Export Options */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Export Report
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" startIcon={<Download />}>
                Export as PDF
              </Button>
              <Button variant="outlined" startIcon={<Download />}>
                Export as Excel
              </Button>
              <Button variant="outlined" startIcon={<Download />}>
                Export as CSV
              </Button>
              <Button variant="outlined" startIcon={<Share />}>
                Share Report
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </motion.div>
  );
};

export default AdminReports;
