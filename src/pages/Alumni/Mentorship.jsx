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
  LinearProgress,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  Groups as GroupsIcon,
  PersonAdd as PersonAddIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';

const Mentorship = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpertise, setFilterExpertise] = useState('all');

  // Mock mentors data
  const mentors = [
    {
      id: 1,
      name: 'Dr. Ahmed Khan',
      photo: 'https://i.pravatar.cc/150?img=11',
      expertise: 'Software Engineering',
      designation: 'Senior Architect',
      company: 'Google',
      graduationYear: 2010,
      rating: 4.9,
      mentees: 15,
      sessionsCompleted: 45,
      specializations: ['System Design', 'Cloud Architecture', 'Leadership'],
      availability: 'Available',
      bio: 'Passionate about helping young engineers grow their careers in tech.',
    },
    {
      id: 2,
      name: 'Sara Ahmed',
      photo: 'https://i.pravatar.cc/150?img=12',
      expertise: 'Data Science',
      designation: 'Lead Data Scientist',
      company: 'Meta',
      graduationYear: 2012,
      rating: 4.8,
      mentees: 12,
      sessionsCompleted: 38,
      specializations: ['Machine Learning', 'Deep Learning', 'Analytics'],
      availability: 'Available',
      bio: 'Helping aspiring data scientists navigate their career paths.',
    },
    {
      id: 3,
      name: 'Hassan Ali',
      photo: 'https://i.pravatar.cc/150?img=13',
      expertise: 'Business Management',
      designation: 'CEO',
      company: 'StartupHub',
      graduationYear: 2008,
      rating: 5.0,
      mentees: 20,
      sessionsCompleted: 62,
      specializations: ['Entrepreneurship', 'Strategy', 'Leadership'],
      availability: 'Limited',
      bio: 'Entrepreneur and mentor helping build the next generation of leaders.',
    },
    {
      id: 4,
      name: 'Fatima Zain',
      photo: 'https://i.pravatar.cc/150?img=14',
      expertise: 'Product Management',
      designation: 'Senior PM',
      company: 'Microsoft',
      graduationYear: 2013,
      rating: 4.7,
      mentees: 10,
      sessionsCompleted: 30,
      specializations: ['Product Strategy', 'User Research', 'Agile'],
      availability: 'Available',
      bio: 'Product leader passionate about creating impactful products.',
    },
    {
      id: 5,
      name: 'Omar Siddiqui',
      photo: 'https://i.pravatar.cc/150?img=15',
      expertise: 'Digital Marketing',
      designation: 'Marketing Director',
      company: 'Amazon',
      graduationYear: 2011,
      rating: 4.6,
      mentees: 8,
      sessionsCompleted: 25,
      specializations: ['SEO', 'Content Strategy', 'Growth Hacking'],
      availability: 'Available',
      bio: 'Digital marketing expert with 12+ years of experience.',
    },
    {
      id: 6,
      name: 'Ayesha Malik',
      photo: 'https://i.pravatar.cc/150?img=16',
      expertise: 'UI/UX Design',
      designation: 'Design Lead',
      company: 'Adobe',
      graduationYear: 2014,
      rating: 4.9,
      mentees: 14,
      sessionsCompleted: 42,
      specializations: ['User Experience', 'Design Systems', 'Prototyping'],
      availability: 'Available',
      bio: 'Design thinking advocate helping designers grow their craft.',
    },
  ];

  const stats = [
    { label: 'Active Mentors', value: '48', change: '+6 this month', trend: 'up', color: 'primary', icon: SchoolIcon },
    { label: 'Mentees', value: '156', change: '+23 new', trend: 'up', color: 'success', icon: GroupsIcon },
    { label: 'Sessions', value: '324', change: 'This year', trend: 'up', color: 'info', icon: TrophyIcon },
  ];

  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.expertise.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mentor.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExpertise = filterExpertise === 'all' || mentor.expertise === filterExpertise;
    return matchesSearch && matchesExpertise;
  });

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'Available':
        return 'success';
      case 'Limited':
        return 'warning';
      case 'Unavailable':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <PageHeader
          title="Mentorship Program"
          subtitle="Connect with experienced alumni mentors to guide your career journey"
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
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  placeholder="Search mentors by name, expertise, or company..."
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
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Expertise Area</InputLabel>
                  <Select
                    value={filterExpertise}
                    onChange={(e) => setFilterExpertise(e.target.value)}
                    label="Expertise Area"
                  >
                    <MenuItem value="all">All Expertise</MenuItem>
                    <MenuItem value="Software Engineering">Software Engineering</MenuItem>
                    <MenuItem value="Data Science">Data Science</MenuItem>
                    <MenuItem value="Business Management">Business Management</MenuItem>
                    <MenuItem value="Product Management">Product Management</MenuItem>
                    <MenuItem value="Digital Marketing">Digital Marketing</MenuItem>
                    <MenuItem value="UI/UX Design">UI/UX Design</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Mentors Grid */}
        <Grid container spacing={3}>
          {filteredMentors.map((mentor) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={mentor.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  {/* Header with Avatar */}
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Avatar
                      src={mentor.photo}
                      sx={{ width: 96, height: 96, mx: 'auto', mb: 2 }}
                    />
                    <Typography variant="h6" fontWeight="bold">
                      {mentor.name}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={600}>
                      {mentor.designation}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mentor.company} • Class of {mentor.graduationYear}
                    </Typography>

                    {/* Rating */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <StarIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                      <Typography variant="body2" fontWeight="bold">
                        {mentor.rating}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({mentor.sessionsCompleted} sessions)
                      </Typography>
                    </Box>

                    {/* Availability */}
                    <Chip
                      label={mentor.availability}
                      size="small"
                      color={getAvailabilityColor(mentor.availability)}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  {/* Expertise Badge */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      backgroundColor: 'action.hover',
                      borderRadius: 2,
                      mb: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Expertise
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {mentor.expertise}
                    </Typography>
                  </Paper>

                  {/* Bio */}
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {mentor.bio}
                  </Typography>

                  {/* Specializations */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Specializations:
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      {mentor.specializations.map((spec, idx) => (
                        <Chip key={idx} label={spec} size="small" sx={{ mb: 0.5 }} />
                      ))}
                    </Stack>
                  </Box>

                  {/* Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {mentor.mentees}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mentees
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" color="info.main">
                          {mentor.sessionsCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sessions
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Actions */}
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PersonAddIcon />}
                      disabled={mentor.availability === 'Unavailable'}
                    >
                      Request Mentorship
                    </Button>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary">
                        <LinkedInIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <EmailIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredMentors.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <GroupsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No mentors found matching your criteria
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

export default Mentorship;
