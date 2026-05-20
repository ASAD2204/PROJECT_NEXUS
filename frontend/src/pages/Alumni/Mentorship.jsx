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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  ListItemIcon,
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
  VolunteerActivism as HeartIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';

const MentorshipDialog = ({ open, onClose, onConfirm, mentorName, loading }) => {
  const [requestData, setRequestData] = useState({
    topic: '',
    message: ''
  });

  const handleConfirm = () => {
    if (!requestData.topic || !requestData.message) return;
    onConfirm(`${requestData.topic}: ${requestData.message}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Request Mentorship from {mentorName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Mentorship Topic"
            placeholder="e.g. Career Advice, Mock Interview, Resume Review"
            value={requestData.topic}
            onChange={(e) => setRequestData({ ...requestData, topic: e.target.value })}
            required
          />
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            placeholder="Tell the mentor about your background and what you hope to learn..."
            value={requestData.message}
            onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading || !requestData.topic || !requestData.message}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Send Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Mentorship = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpertise, setFilterExpertise] = useState('all');

  const [mentors, setMentors] = useState([]);
  const [stats, setStats] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mentorshipData, setMentorshipData] = useState({
    specialization: '',
    bio: '',
    available_slots: 5
  });

  const userRole = (user?.role || '').toLowerCase();
  const isAlumni = userRole === 'alumni' || userRole === 'admin';

  const normalizeMentor = (mentor) => ({
    id: mentor.mentorship_id || mentor.id,
    alumni_id: mentor.alumni_id || mentor.alumni?.alumni_id,
    mentor_id: mentor.mentor_id,
    name: mentor.alumni?.full_name || mentor.alumni?.name || mentor.name || `Mentor ${mentor.mentor_id || mentor.id || ''}`,
    email: mentor.alumni?.email || '',
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
    availability: mentor.is_active === false ? 'Unavailable' : (mentor.available_slots > 0 ? 'Available' : 'Limited'),
    user_id: mentor.alumni?.user_id,
  });

  const myMentorship = mentors.find(m => String(m.user_id) === String(user?.user_id));

  const fetchMentors = async () => {
    try {
      const res = await alumniAPI.getMentors();
      const data = res.data?.mentors || res.data || [];
      const mentorList = (Array.isArray(data) ? data : []).map(normalizeMentor);
      setMentors(mentorList);
      setStats([
        { title: 'Active Mentors', value: String(mentorList.length), subtitle: 'Available', color: 'primary', icon: SchoolIcon, tooltip: 'Experienced alumni available for mentorship' },
        { title: 'Mentees', value: String(mentorList.reduce((s, m) => s + ((m.mentees || 0)), 0)), subtitle: 'Enrolled', color: 'success', icon: GroupsIcon, tooltip: 'Students currently enrolled in mentorship programs' },
        { title: 'Sessions', value: String(mentorList.reduce((s, m) => s + ((m.sessionsCompleted || 0)), 0)), subtitle: 'Completed', color: 'info', icon: TrophyIcon, tooltip: 'Total mentorship sessions completed' },
      ]);
    } catch (e) { 
      console.error(e);
      showSnackbar('Failed to fetch mentors', 'error');
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [user]);

  const handleSubmitMentorship = async () => {
    if (!mentorshipData.specialization || !mentorshipData.bio) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      await alumniAPI.createMentorship(mentorshipData);
      showSnackbar('Mentorship profile created successfully!', 'success');
      setOpenDialog(false);
      fetchMentors();
    } catch (e) {
      showSnackbar(e.response?.data?.detail || 'Failed to create mentorship profile', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleOpenRequest = (mentor) => {
    setSelectedMentor(mentor);
    setOpenRequestDialog(true);
  };

  const handleConfirmRequest = async (message) => {
    if (!selectedMentor) return;
    try {
      setSubmitting(true);
      await alumniAPI.requestMentorship({
        alumni_id: selectedMentor.alumni_id,
        message: message
      });
      showSnackbar(`Mentorship request sent to ${selectedMentor.name}`, 'success');
      setOpenRequestDialog(false);
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.detail || 'Failed to send mentorship request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <PageHeader
            title="Mentorship Program"
            subtitle="Connect with experienced alumni mentors to guide your career journey"
          />
          {isAlumni && !myMentorship && (
            <Button
              variant="contained"
              startIcon={<HeartIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 'bold', 
                mt: { xs: 1, md: 2 },
                background: 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)',
                boxShadow: '0 4px 15px rgba(255, 75, 43, 0.3)',
                '&:hover': { background: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' }
              }}
            >
              Become a Mentor
            </Button>
          )}
          {myMentorship && (
            <Chip 
              icon={<StarIcon />} 
              label="You are a Mentor" 
              color="success" 
              variant="outlined" 
              sx={{ mt: { xs: 1, md: 2 }, fontWeight: 'bold', py: 2 }} 
            />
          )}
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Filters Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
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
              <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={6} lg={4} key={mentor.id}>
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
                      sx={{ width: 96, height: 96, mx: 'auto', mb: 2, border: '3px solid', borderColor: 'primary.light' }}
                    >
                        {mentor.name[0]}
                    </Avatar>
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
                        {mentor.rating || 'New'}
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
                      sx={{ mt: 1, fontWeight: 'bold' }}
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
                  <Typography variant="body2" color="text.secondary" paragraph sx={{ minHeight: 60 }}>
                    {mentor.bio}
                  </Typography>

                  {/* Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                          {mentor.mentees}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mentees
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
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
                      disabled={mentor.availability === 'Unavailable' || String(mentor.user_id) === String(user?.user_id)}
                      onClick={() => handleOpenRequest(mentor)}
                      sx={{ borderRadius: 2, fontWeight: 'bold' }}
                    >
                      {String(mentor.user_id) === String(user?.user_id) ? 'My Mentor Profile' : 'Request Mentorship'}
                    </Button>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary" onClick={() => mentor.alumni?.linkedin_url && window.open(mentor.alumni.linkedin_url, '_blank')}>
                        <LinkedInIcon />
                      </IconButton>
                      <IconButton size="small" color="primary" onClick={() => (window.location.href = `mailto:${mentor.email}`)}>
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

        {/* Become a Mentor Dialog */}
        <Dialog open={openDialog} onClose={() => !submitting && setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Become a Mentor</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Area of Expertise / Specialization"
                  placeholder="e.g. Software Architecture, Digital Marketing"
                  value={mentorshipData.specialization}
                  onChange={(e) => setMentorshipData({ ...mentorshipData, specialization: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Available Slots"
                  type="number"
                  placeholder="How many mentees can you handle?"
                  value={mentorshipData.available_slots}
                  onChange={(e) => setMentorshipData({ ...mentorshipData, available_slots: parseInt(e.target.value) || 0 })}
                  helperText="Recommended: 3-5 slots"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio / Mentorship Philosophy"
                  multiline
                  rows={4}
                  placeholder="Share your experience and how you can help students..."
                  value={mentorshipData.bio}
                  onChange={(e) => setMentorshipData({ ...mentorshipData, bio: e.target.value })}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)} disabled={submitting}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmitMentorship}
              disabled={submitting}
              startIcon={submitting && <CircularProgress size={20} color="inherit" />}
              sx={{ fontWeight: 'bold', borderRadius: 2 }}
            >
              Start Mentoring
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mentorship Request Dialog */}
        {selectedMentor && (
          <MentorshipDialog
            open={openRequestDialog}
            onClose={() => setOpenRequestDialog(false)}
            onConfirm={handleConfirmRequest}
            mentorName={selectedMentor.name}
            loading={submitting}
          />
        )}
      </Box>
    </motion.div>
  );
};

export default Mentorship;
