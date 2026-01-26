import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Stack,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  BusinessCenter as IndustryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';

const AlumniDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock alumni data
  const alumni = [
    {
      id: 1,
      name: 'Ahmed Hassan',
      photo: 'https://i.pravatar.cc/150?img=12',
      graduationYear: 2020,
      degree: 'BS Computer Science',
      currentRole: 'Senior Software Engineer',
      company: 'Google',
      location: 'Dubai, UAE',
      industry: 'Technology',
      email: 'ahmed.hassan@gmail.com',
      phone: '+971-50-123-4567',
      linkedin: 'linkedin.com/in/ahmedhassan',
      bio: 'Passionate about building scalable systems and mentoring young developers. Specialized in cloud architecture and distributed systems.',
      expertise: ['Cloud Computing', 'System Design', 'Microservices'],
      mentoring: true,
    },
    {
      id: 2,
      name: 'Sara Malik',
      photo: 'https://i.pravatar.cc/150?img=5',
      graduationYear: 2019,
      degree: 'BS Software Engineering',
      currentRole: 'Product Manager',
      company: 'Microsoft',
      location: 'Seattle, USA',
      industry: 'Technology',
      email: 'sara.malik@outlook.com',
      phone: '+1-206-555-0123',
      linkedin: 'linkedin.com/in/saramalik',
      bio: 'Leading product strategy for Azure AI services. Love helping students navigate their career paths in tech.',
      expertise: ['Product Management', 'AI/ML', 'Strategy'],
      mentoring: true,
    },
    {
      id: 3,
      name: 'Omar Abdullah',
      photo: 'https://i.pravatar.cc/150?img=13',
      graduationYear: 2018,
      degree: 'BS Computer Science',
      currentRole: 'Data Scientist',
      company: 'Amazon',
      location: 'London, UK',
      industry: 'E-commerce',
      email: 'omar.abdullah@amazon.com',
      phone: '+44-20-7123-4567',
      linkedin: 'linkedin.com/in/omarabdullah',
      bio: 'Working on recommendation systems and predictive analytics. Always happy to discuss data science opportunities.',
      expertise: ['Machine Learning', 'Data Analytics', 'Python'],
      mentoring: true,
    },
    {
      id: 4,
      name: 'Fatima Noor',
      photo: 'https://i.pravatar.cc/150?img=9',
      graduationYear: 2021,
      degree: 'BS Computer Science',
      currentRole: 'Full Stack Developer',
      company: 'Careem',
      location: 'Karachi, Pakistan',
      industry: 'Transportation',
      email: 'fatima.noor@careem.com',
      phone: '+92-21-3456-7890',
      linkedin: 'linkedin.com/in/fatimanoor',
      bio: 'Building mobile-first web applications. Passionate about creating impact through technology in Pakistan.',
      expertise: ['React', 'Node.js', 'Mobile Development'],
      mentoring: false,
    },
    {
      id: 5,
      name: 'Hassan Ali',
      photo: 'https://i.pravatar.cc/150?img=14',
      graduationYear: 2017,
      degree: 'BS Software Engineering',
      currentRole: 'Cybersecurity Consultant',
      company: 'Deloitte',
      location: 'Abu Dhabi, UAE',
      industry: 'Consulting',
      email: 'hassan.ali@deloitte.com',
      phone: '+971-2-987-6543',
      linkedin: 'linkedin.com/in/hassanali',
      bio: 'Helping organizations secure their digital infrastructure. Specialized in penetration testing and security audits.',
      expertise: ['Cybersecurity', 'Ethical Hacking', 'Risk Assessment'],
      mentoring: true,
    },
    {
      id: 6,
      name: 'Ayesha Khan',
      photo: 'https://i.pravatar.cc/150?img=10',
      graduationYear: 2020,
      degree: 'BS Computer Science',
      currentRole: 'UX Designer',
      company: 'Spotify',
      location: 'Stockholm, Sweden',
      industry: 'Entertainment',
      email: 'ayesha.khan@spotify.com',
      phone: '+46-8-123-4567',
      linkedin: 'linkedin.com/in/ayeshakhan',
      bio: 'Creating delightful user experiences for millions of users worldwide. Love to discuss design thinking and user research.',
      expertise: ['UX Design', 'User Research', 'Prototyping'],
      mentoring: true,
    },
  ];

  const filteredAlumni = alumni.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewProfile = (alumnus) => {
    setSelectedAlumni(alumnus);
    setDialogOpen(true);
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Alumni Directory"
          subtitle="Connect with our successful alumni around the world"
        />

        {/* Search */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by name, company, role, or industry..."
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
          </CardContent>
        </Card>

        {/* Alumni Grid */}
        <Grid container spacing={3}>
          {filteredAlumni.map((alumnus) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={alumnus.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s ease',
                  borderRadius: { xs: 2, sm: 3 },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Avatar
                      src={alumnus.photo}
                      sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, border: 3, borderColor: 'primary.main' }}
                    />
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {alumnus.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Class of {alumnus.graduationYear}
                      </Typography>
                    </Box>

                    <Chip
                      icon={<WorkIcon />}
                      label={alumnus.currentRole}
                      color="primary"
                      size="small"
                    />

                    <Stack direction="row" spacing={1} alignItems="center">
                      <IndustryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" fontWeight={600}>
                        {alumnus.company}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {alumnus.location}
                      </Typography>
                    </Stack>

                    {alumnus.mentoring && (
                      <Chip label="Available for Mentoring" color="success" size="small" />
                    )}

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleViewProfile(alumnus)}
                    >
                      View Profile
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Profile Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={window.innerWidth < 600}
        >
          {selectedAlumni && (
            <>
              <DialogTitle sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                  <Avatar
                    src={selectedAlumni.photo}
                    sx={{ width: { xs: 70, sm: 60 }, height: { xs: 70, sm: 60 } }}
                  />
                  <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                      {selectedAlumni.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {selectedAlumni.degree} • Class of {selectedAlumni.graduationYear}
                    </Typography>
                  </Box>
                </Stack>
              </DialogTitle>
              <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={3}>
                  {/* Current Position */}
                  <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, backgroundColor: 'action.hover', borderRadius: 2 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <WorkIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.875rem', sm: '0.975rem' } }}>
                          Current Position
                        </Typography>
                      </Stack>
                      <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                        {selectedAlumni.currentRole}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {selectedAlumni.company} • {selectedAlumni.location}
                      </Typography>
                    </Stack>
                  </Paper>

                  {/* Bio */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '0.975rem' } }}>
                      About
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {selectedAlumni.bio}
                    </Typography>
                  </Box>

                  {/* Expertise */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Areas of Expertise
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedAlumni.expertise.map((skill, idx) => (
                        <Chip key={idx} label={skill} size="small" color="primary" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Contact Info */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Contact Information
                    </Typography>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2">{selectedAlumni.email}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2">{selectedAlumni.phone}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinkedInIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2">{selectedAlumni.linkedin}</Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {selectedAlumni.mentoring && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: 'success.main',
                        color: 'white',
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        ✓ Available for mentoring! Feel free to reach out for career guidance.
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
                <Button variant="contained" startIcon={<EmailIcon />}>
                  Send Message
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default AlumniDirectory;
