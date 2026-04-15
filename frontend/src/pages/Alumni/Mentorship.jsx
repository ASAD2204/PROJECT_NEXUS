import React, { useState, useEffect } from 'react';
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
import { alumniAPI } from '../../api/alumni';

const Mentorship = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpertise, setFilterExpertise] = useState('all');

  const [mentors, setMentors] = useState([]);
  const [stats, setStats] = useState([]);

  const normalizeMentor = (mentor) => ({
    id: mentor.mentorship_id || mentor.id,
    name: mentor.alumni?.name || mentor.name || `Mentor ${mentor.mentor_id || mentor.id || ''}`,
    designation: mentor.alumni?.current_position || mentor.designation || '',
    company: mentor.alumni?.current_employer || mentor.company || '',
    graduationYear: mentor.alumni?.grad_year || mentor.graduationYear || '',
    photo: mentor.alumni?.photo_url || mentor.photo || '',
    expertise: mentor.specialization || mentor.expertise || '',
    bio: mentor.bio || '',
    specializations: Array.isArray(mentor.specializations)
      ? mentor.specializations
      : (mentor.specialization ? [mentor.specialization] : []),
    mentees: mentor.mentees || 0,
    sessionsCompleted: mentor.sessions_completed || mentor.sessionsCompleted || 0,
    rating: mentor.rating || 0,
    availability: mentor.is_active === false ? 'Unavailable' : mentor.available_slots > 0 ? 'Available' : 'Limited',
  });

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await alumniAPI.getMentors();
        const data = res.data?.mentors || res.data || [];
        setMentors((Array.isArray(data) ? data : []).map(normalizeMentor));
        setStats([
          { title: 'Active Mentors', value: String(data.length), subtitle: 'Available', color: 'primary', icon: SchoolIcon, tooltip: 'Experienced alumni available for mentorship' },
          { title: 'Mentees', value: String(data.reduce((s, m) => s + ((m.mentees || 0)), 0)), subtitle: 'Enrolled', color: 'success', icon: GroupsIcon, tooltip: 'Students currently enrolled in mentorship programs' },
          { title: 'Sessions', value: String(data.reduce((s, m) => s + ((m.sessionsCompleted || m.sessions_completed || 0)), 0)), subtitle: 'Completed', color: 'info', icon: TrophyIcon, tooltip: 'Total mentorship sessions completed' },
        ]);
      } catch (e) { console.error(e); }
    };
    fetchMentors();
  }, []);

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
