import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  CheckCircle,
  School,
  Download,
  Print,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import PageTransition from '../../components/Common/PageTransition';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const gradeDistribution = [
  { grade: 'A', count: 12, percentage: 26.7 },
  { grade: 'B', count: 18, percentage: 40.0 },
  { grade: 'C', count: 9, percentage: 20.0 },
  { grade: 'D', count: 4, percentage: 8.9 },
  { grade: 'F', count: 2, percentage: 4.4 },
];

const attendanceTrend = [
  { week: 'Week 1', attendance: 92 },
  { week: 'Week 2', attendance: 88 },
  { week: 'Week 3', attendance: 90 },
  { week: 'Week 4', attendance: 85 },
  { week: 'Week 5', attendance: 87 },
  { week: 'Week 6', attendance: 89 },
];

const assignmentStats = [
  { name: 'On Time', value: 72, color: '#4caf50' },
  { name: 'Late', value: 18, color: '#ff9800' },
  { name: 'Missing', value: 10, color: '#f44336' },
];

const studentPerformance = [
  { name: 'Excellent (A/A+)', value: 15, percentage: 17.6, color: '#2e7d32' },
  { name: 'Good (B/B+)', value: 28, percentage: 32.9, color: '#4caf50' },
  { name: 'Average (C/C+)', value: 24, percentage: 28.2, color: '#ff9800' },
  { name: 'Below Average (D)', value: 12, percentage: 14.1, color: '#f57c00' },
  { name: 'Failing (F)', value: 6, percentage: 7.1, color: '#d32f2f' },
];

const weeklyProgress = [
  { week: 'Week 1', avgScore: 72, attendance: 92 },
  { week: 'Week 2', avgScore: 75, attendance: 88 },
  { week: 'Week 3', avgScore: 78, attendance: 90 },
  { week: 'Week 4', avgScore: 76, attendance: 85 },
  { week: 'Week 5', avgScore: 80, attendance: 87 },
  { week: 'Week 6', avgScore: 82, attendance: 89 },
  { week: 'Week 7', avgScore: 84, attendance: 91 },
  { week: 'Week 8', avgScore: 85, attendance: 93 },
];

const courseComparison = [
  { course: 'CS-301', avgGrade: 3.2, passRate: 88, students: 85 },
  { course: 'CS-201', avgGrade: 3.5, passRate: 92, students: 72 },
  { course: 'CS-101', avgGrade: 3.8, passRate: 95, students: 68 },
];

const Reports = () => {
  const theme = useTheme();
  const [course, setCourse] = useState('CS-301');
  const [range, setRange] = useState('last-30');

  const stats = [
    {
      title: 'Total Students',
      value: '85',
      subtitle: '+5 this month',
      icon: People,
      color: theme.palette.primary.main,
      tooltip: 'Total students enrolled in this course. Track individual performance and generate detailed reports',
    },
    {
      title: 'Avg Attendance',
      value: '88.5%',
      subtitle: '+2.3%',
      icon: CheckCircle,
      color: theme.palette.success.main,
      tooltip: 'Average attendance rate for this course. Shows improvement of 2.3% compared to previous period',
    },
    {
      title: 'Assignment Completion',
      value: '72%',
      subtitle: '-5.2%',
      icon: Assignment,
      color: theme.palette.warning.main,
      tooltip: 'Percentage of students who submitted assignments on time. Decreased by 5.2%, may need follow-up',
    },
    {
      title: 'Class Average',
      value: 'B+',
      subtitle: '+0.2 GPA',
      icon: School,
      color: theme.palette.info.main,
      tooltip: 'Average grade for the class. Shows improvement of 0.2 GPA points compared to previous assessment',
    },
  ];

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          icon={TrendingUp}
          title="Course Analytics & Reports"
          subtitle="Generate performance insights and track student progress"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />

        {/* STATS CARDS */}
        <Grid 
          container 
          spacing={3} 
          sx={{ mb: 4 }}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index} component={motion.div} variants={fadeInUp}>
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

        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* FILTERS */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  sx={{ mb: 0 }}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flex: 1 }}>
                    <TextField
                      select
                      label="Course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 220 } }}
                      size="small"
                    >
                      <MenuItem value="CS-301">CS-301 - Data Structures</MenuItem>
                      <MenuItem value="CS-201">CS-201 - OOP</MenuItem>
                      <MenuItem value="CS-101">CS-101 - Intro to Computing</MenuItem>
                    </TextField>
                    <TextField
                      select
                      label="Date Range"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 200 } }}
                      size="small"
                    >
                      <MenuItem value="last-7">Last 7 Days</MenuItem>
                      <MenuItem value="last-30">Last 30 Days</MenuItem>
                      <MenuItem value="semester">This Semester</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
                    <Button variant="outlined" startIcon={<Download />} size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      Export
                    </Button>
                    <Button variant="outlined" startIcon={<Print />} size="small" sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                      Print
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* GRADE DISTRIBUTION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Grade Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current semester performance breakdown
                    </Typography>
                  </Box>
                  <Chip label="Active Semester" size="small" color="primary" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 260, sm: 300, md: 320, lg: 350 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="grade" 
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
                        cursor={{ fill: 'rgba(102,126,234,0.1)' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#gradeGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                {/* Grade breakdown */}
                <Box sx={{ mt: 3 }}>
                  {gradeDistribution.map((item) => (
                    <Box key={item.grade} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Grade {item.grade}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count} students ({item.percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={item.percentage * 2.22} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ASSIGNMENT COMPLETION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(33,150,243,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Assignment Submission
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submission status breakdown
                    </Typography>
                  </Box>
                  <Chip label="Current" size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="onTimeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4caf50" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9800" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#f57c00" stopOpacity={0.8}/>
                        </linearGradient>
                        <linearGradient id="missingGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f44336" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#c62828" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <Pie
                        data={assignmentStats}
                        cx="50%"
                        cy="50%"
                        innerRadius="35%"
                        outerRadius="55%"
                        dataKey="value"
                        paddingAngle={2}
                        stroke="white"
                        strokeWidth={2}
                        label={(entry) => `${entry.value}%`}
                        labelLine={{ stroke: '#666', strokeWidth: 1 }}
                      >
                        <Cell fill="url(#onTimeGradient)" />
                        <Cell fill="url(#lateGradient)" />
                        <Cell fill="url(#missingGradient)" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  {assignmentStats.map((item) => (
                    <Box 
                      key={item.name} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: alpha(item.color, 0.1),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: item.color 
                          }} 
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {item.value}%
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ATTENDANCE TREND */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(139,195,74,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Attendance Trend
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Weekly attendance rate over time
                    </Typography>
                  </Box>
                  <Chip label="Last 8 Weeks" size="small" color="success" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 260, sm: 300, md: 320, lg: 350 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="week" 
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
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#attendanceGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* STUDENT PERFORMANCE DISTRIBUTION */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(156,39,176,0.05) 0%, rgba(123,31,162,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Student Performance Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Overall class performance breakdown by category
                    </Typography>
                  </Box>
                  <Chip label="85 Students" size="small" color="secondary" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentPerformance} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        {studentPerformance.map((item, idx) => (
                          <linearGradient key={idx} id={`perfGrad${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={item.color} stopOpacity={1}/>
                            <stop offset="100%" stopColor={item.color} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="name" 
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
                        cursor={{ fill: 'rgba(156,39,176,0.1)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={80}
                      >
                        {studentPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#perfGrad${index})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    {studentPerformance.map((item, idx) => (
                      <Grid key={idx} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                        <Paper 
                          elevation={0}
                          sx={{ 
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(item.color, 0.1),
                            border: `2px solid ${alpha(item.color, 0.3)}`,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.name}
                          </Typography>
                          <Typography variant="h5" fontWeight="bold" color={item.color}>
                            {item.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.percentage}% of class
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* WEEKLY PROGRESS TRACKING */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(21,101,192,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Weekly Progress Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average test scores vs attendance correlation
                    </Typography>
                  </Box>
                  <Chip label="8 Week Trend" size="small" color="info" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyProgress} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.primary.main} stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="attendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="week" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
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
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke={theme.palette.primary.main}
                        strokeWidth={3}
                        fill="url(#scoreGradient)"
                        dot={{ fill: theme.palette.primary.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                        name="Avg Score"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="attendance" 
                        stroke={theme.palette.success.main}
                        strokeWidth={3}
                        fill="url(#attendGradient)"
                        dot={{ fill: theme.palette.success.main, r: 5, strokeWidth: 2, stroke: 'white' }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* COURSE COMPARISON */}
          <Grid size={{ xs: 12 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(255,152,0,0.05) 0%, rgba(251,140,0,0.05) 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
            }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Course Comparison Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Compare average grades and pass rates across your courses
                    </Typography>
                  </Box>
                  <Chip label="3 Courses" size="small" color="warning" variant="outlined" />
                </Stack>
                <Box sx={{ height: { xs: 300, sm: 350, md: 400 }, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseComparison} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.warning.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.warning.main} stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={1}/>
                          <stop offset="100%" stopColor={theme.palette.success.main} stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="course" 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 4]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'GPA', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]} 
                        stroke="#666" 
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Pass Rate %', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        cursor={{ fill: 'rgba(255,152,0,0.1)' }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="avgGrade" 
                        fill="url(#gradeGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Average Grade (GPA)"
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="passRate" 
                        fill="url(#passGrad)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        name="Pass Rate %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default Reports;
