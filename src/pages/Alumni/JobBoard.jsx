import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Stack,
  Paper,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';

const JobBoard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  // Mock job listings
  const jobs = [
    {
      id: 1,
      title: 'Senior Software Engineer',
      company: 'Tech Solutions Inc.',
      logo: 'https://i.pravatar.cc/150?img=1',
      location: 'Karachi, Pakistan',
      type: 'Full-time',
      salary: '200K - 300K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '2 days ago',
      description: 'Looking for experienced software engineers to join our growing team.',
      requirements: ['5+ years experience', 'React/Node.js', 'Team leadership'],
      applicants: 12,
    },
    {
      id: 2,
      title: 'Data Scientist',
      company: 'Analytics Pro',
      logo: 'https://i.pravatar.cc/150?img=2',
      location: 'Lahore, Pakistan',
      type: 'Full-time',
      salary: '180K - 250K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '5 days ago',
      description: 'Join our data team to work on cutting-edge ML projects.',
      requirements: ['Python/R', 'Machine Learning', 'Statistics'],
      applicants: 8,
    },
    {
      id: 3,
      title: 'UI/UX Designer',
      company: 'Creative Studio',
      logo: 'https://i.pravatar.cc/150?img=3',
      location: 'Remote',
      type: 'Contract',
      salary: '150K - 200K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '1 week ago',
      description: 'Design beautiful and intuitive user experiences for web and mobile.',
      requirements: ['Figma/Adobe XD', 'Portfolio', '3+ years experience'],
      applicants: 15,
    },
    {
      id: 4,
      title: 'Product Manager',
      company: 'Innovation Labs',
      logo: 'https://i.pravatar.cc/150?img=4',
      location: 'Islamabad, Pakistan',
      type: 'Full-time',
      salary: '250K - 350K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '3 days ago',
      description: 'Lead product strategy and development for our flagship products.',
      requirements: ['Product Management', 'Agile/Scrum', 'Stakeholder Management'],
      applicants: 20,
    },
    {
      id: 5,
      title: 'Backend Developer',
      company: 'Cloud Systems',
      logo: 'https://i.pravatar.cc/150?img=5',
      location: 'Karachi, Pakistan',
      type: 'Full-time',
      salary: '150K - 220K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '4 days ago',
      description: 'Build scalable backend systems using modern cloud technologies.',
      requirements: ['Node.js/Python', 'AWS/Azure', 'Microservices'],
      applicants: 10,
    },
    {
      id: 6,
      title: 'Marketing Manager',
      company: 'Brand Builders',
      logo: 'https://i.pravatar.cc/150?img=6',
      location: 'Lahore, Pakistan',
      type: 'Full-time',
      salary: '120K - 180K PKR',
      postedBy: 'Alumni Relations',
      postedDate: '1 week ago',
      description: 'Drive marketing strategy and brand awareness initiatives.',
      requirements: ['Digital Marketing', 'SEO/SEM', 'Analytics'],
      applicants: 18,
    },
  ];

  const stats = [
    { 
      title: 'Total Jobs', 
      value: '142', 
      subtitle: '+12 this week', 
      color: 'primary', 
      icon: WorkIcon,
      tooltip: 'Total job opportunities posted by alumni and partner companies. Updated regularly with new positions'
    },
    { 
      title: 'Companies', 
      value: '56', 
      subtitle: '+5 new', 
      color: 'success', 
      icon: BusinessIcon,
      tooltip: 'Number of companies hiring through our alumni network. Includes startups, MNCs, and local organizations'
    },
    { 
      title: 'Applications', 
      value: '83', 
      subtitle: 'This month', 
      color: 'info', 
      icon: TrendingUpIcon,
      tooltip: 'Total job applications submitted by students and alumni this month. Track your application status in real-time'
    },
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || job.type === filterType;
    const matchesLocation = filterLocation === 'all' || job.location.toLowerCase().includes(filterLocation.toLowerCase());
    return matchesSearch && matchesType && matchesLocation;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'Full-time':
        return 'success';
      case 'Part-time':
        return 'warning';
      case 'Contract':
        return 'info';
      case 'Internship':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <PageHeader
          title="Job Board"
          subtitle="Explore career opportunities posted by alumni and partner companies"
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Filters Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  placeholder="Search jobs or companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Job Type</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label="Job Type"
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Internship">Internship</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    label="Location"
                  >
                    <MenuItem value="all">All Locations</MenuItem>
                    <MenuItem value="karachi">Karachi</MenuItem>
                    <MenuItem value="lahore">Lahore</MenuItem>
                    <MenuItem value="islamabad">Islamabad</MenuItem>
                    <MenuItem value="remote">Remote</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Job Listings */}
        <Grid container spacing={3}>
          {filteredJobs.map((job) => (
            <Grid size={{ xs: 12 }} key={job.id}>
              <Card
                sx={{
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Avatar
                          src={job.logo}
                          sx={{ width: 64, height: 64 }}
                          variant="rounded"
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {job.title}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                            <Chip
                              icon={<BusinessIcon />}
                              label={job.company}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              icon={<LocationIcon />}
                              label={job.location}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={job.type}
                              size="small"
                              color={getTypeColor(job.type)}
                            />
                          </Stack>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <MoneyIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {job.salary}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ScheduleIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {job.postedDate}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" paragraph>
                        {job.description}
                      </Typography>

                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Requirements:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                          {job.requirements.map((req, idx) => (
                            <Chip key={idx} label={req} size="small" sx={{ mb: 1 }} />
                          ))}
                        </Stack>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          backgroundColor: 'action.hover',
                          borderRadius: 2,
                          textAlign: 'center',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                          {job.applicants}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Applicants
                        </Typography>
                        <Button variant="contained" fullWidth size="large">
                          Apply Now
                        </Button>
                        <Button variant="outlined" fullWidth size="small" sx={{ mt: 1 }}>
                          Save Job
                        </Button>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredJobs.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <WorkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No jobs found matching your criteria
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search terms
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </motion.div>
  );
};

export default JobBoard;
