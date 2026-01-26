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
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
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
    { 
      title: 'Total Students', 
      value: '2,847', 
      subtitle: '+12.5% from last year', 
      color: 'primary',
      icon: People,
      tooltip: 'Total number of students enrolled across all departments and programs'
    },
    { 
      title: 'Total Revenue', 
      value: '₨ 48.5M', 
      subtitle: '+15.3% increase', 
      color: 'success',
      icon: Payment,
      tooltip: 'Total revenue generated from tuition fees, lab fees, and other charges'
    },
    { 
      title: 'Avg Attendance', 
      value: '87%', 
      subtitle: '+2.1% improvement', 
      color: 'info',
      icon: School,
      tooltip: 'Average attendance rate across all classes and programs'
    },
    { 
      title: 'Course Completion', 
      value: '94%', 
      subtitle: '+3.2% this year', 
      color: 'warning',
      icon: Assessment,
      tooltip: 'Percentage of students successfully completing their enrolled courses'
    },
  ];

  const enrollmentData = [
    { department: 'CS', students: 852 },
    { department: 'Business', students: 743 },
    { department: 'Engineering', students: 621 },
    { department: 'Medical', students: 431 },
    { department: 'Arts', students: 200 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 6.5 },
    { month: 'Feb', revenue: 7.2 },
    { month: 'Mar', revenue: 6.8 },
    { month: 'Apr', revenue: 7.5 },
    { month: 'May', revenue: 8.1 },
    { month: 'Jun', revenue: 8.5 },
  ];

  const attendanceByDepartment = [
    { dept: 'CS', attendance: 89 },
    { dept: 'Business', attendance: 85 },
    { dept: 'Engineering', attendance: 87 },
    { dept: 'Medical', attendance: 92 },
    { dept: 'Arts', attendance: 83 },
  ];

  const studentGrowth = [
    { year: '2021', students: 2145 },
    { year: '2022', students: 2387 },
    { year: '2023', students: 2543 },
    { year: '2024', students: 2689 },
    { year: '2025', students: 2847 },
  ];

  const facultyDistribution = [
    { department: 'CS', faculty: 45, students: 852 },
    { department: 'Business', faculty: 38, students: 743 },
    { department: 'Engineering', faculty: 42, students: 621 },
    { department: 'Medical', faculty: 35, students: 431 },
    { department: 'Arts', faculty: 22, students: 200 },
  ];

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
                  <Button fullWidth variant="contained" startIcon={<Assessment />} sx={{ minWidth: { xs: '100%', md: 'auto' } }}>
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
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                tooltip={stat.tooltip}
              />
            </Grid>
          ))}
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
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
                <Box sx={{ height: { xs: 280, sm: 320, md: 350 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Department Enrollment
                </Typography>
                <Box sx={{ height: { xs: 280, sm: 320, md: 350 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="department" 
                        stroke="#666" 
                        style={{ fontSize: '0.7rem' }}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(25,118,210,0.1)' }}
                      />
                      <Bar 
                        dataKey="students" 
                        fill="url(#enrollmentGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* STUDENT GROWTH TREND */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Student Enrollment Growth
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Year-over-year student enrollment trends
                    </Typography>
                  </Box>
                  <Chip label="5 Year Trend" size="small" color="primary" variant="outlined" />
                </Box>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentGrowth} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="students" 
                        stroke={theme.palette.primary.main}
                        strokeWidth={4}
                        fill="url(#growthGradient)"
                        dot={{ fill: theme.palette.primary.main, r: 6, strokeWidth: 3, stroke: 'white' }}
                        activeDot={{ r: 8, strokeWidth: 3, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ATTENDANCE BY DEPARTMENT */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Attendance Rate by Department
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Department-wise attendance performance comparison
                    </Typography>
                  </Box>
                  <Chip label="Current Semester" size="small" color="success" variant="outlined" />
                </Box>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceByDepartment} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="attendDeptGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="dept" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(76,175,80,0.1)' }}
                      />
                      <Bar 
                        dataKey="attendance" 
                        fill="url(#attendDeptGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* FACULTY TO STUDENT RATIO */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Faculty-Student Ratio Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Faculty count vs student enrollment by department
                    </Typography>
                  </Box>
                  <Chip label="All Departments" size="small" color="info" variant="outlined" />
                </Box>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={facultyDistribution} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="facultyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.info.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.info.main} stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.warning.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.warning.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="department" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Faculty', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Students', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(33,150,243,0.1)' }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="faculty" 
                        fill="url(#facultyGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Faculty Members"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="students" 
                        fill="url(#studentGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Students Enrolled"
                      />
                    </BarChart>
                  </ResponsiveContainer>
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
