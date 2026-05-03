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
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import FileDropzone from '../../components/Forms/FileDropzone';

const JobBoard = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const userRole = (user?.role || '').toLowerCase();
  const canPostJobs = userRole === 'alumni' || userRole === 'admin';
  
  const [profileExists, setProfileExists] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [jobImageFile, setJobImageFile] = useState(null);
  const [jobFormData, setJobFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    apply_link: '',
    salary: '',
    description: '',
    requirements: '',
  });

  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(() => {
    const saved = localStorage.getItem('savedJobIds');
    return saved ? JSON.parse(saved) : [];
  });

  const handleApply = (job) => {
    if (job.apply_link) {
      const url = job.apply_link.startsWith('http') ? job.apply_link : `https://${job.apply_link}`;
      window.open(url, '_blank');
      showSnackbar(`Redirecting to apply for ${job.title}`, 'success');
    } else {
      showSnackbar('No application link provided for this job. Please contact the company directly.', 'warning');
    }
  };

  const handleSaveToggle = (jobId) => {
    const isSaved = savedJobIds.includes(jobId);
    const newSaved = isSaved
      ? savedJobIds.filter(id => id !== jobId)
      : [...savedJobIds, jobId];
    
    setSavedJobIds(newSaved);
    localStorage.setItem('savedJobIds', JSON.stringify(newSaved));
    showSnackbar(isSaved ? 'Job removed from saved list' : 'Job saved successfully!', 'success');
  };

  const normalizeJob = (job) => ({
    id: job.job_id || job.id,
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    type: job.job_type || job.type || 'Full-time',
    salary: job.salary || '',
    description: job.description || '',
    requirements: Array.isArray(job.requirements)
      ? job.requirements
      : typeof job.requirements === 'string'
        ? job.requirements.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
    postedDate: job.posted_at ? new Date(job.posted_at).toLocaleDateString() : '',
    applicants: job.applicants || 0,
    logo: job.cover_image || job.logo || '',
    cover_image: job.cover_image || job.logo || '',
    apply_link: job.apply_link || '',
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await alumniAPI.getJobs();
        const data = res.data?.jobs || res.data || [];
        const normalized = (Array.isArray(data) ? data : []).map(normalizeJob);
        setJobs(normalized);
        setStats([
          { title: 'Total Jobs', value: String(normalized.length), subtitle: 'Available now', color: 'primary', icon: WorkIcon, tooltip: 'Total job opportunities posted by alumni and partner companies' },
          { title: 'Companies', value: String(new Set(normalized.map(j => j.company)).size), subtitle: 'Hiring', color: 'success', icon: BusinessIcon, tooltip: 'Number of companies hiring through our alumni network' },
          { title: 'Applications', value: String(normalized.reduce((s, j) => s + (j.applicants || 0), 0)), subtitle: 'Total', color: 'info', icon: TrendingUpIcon, tooltip: 'Total job applications submitted' },
        ]);
      } catch (e) { console.error(e); }
    };

    const checkProfile = async () => {
      if (userRole === 'alumni') {
        try {
          await alumniAPI.getProfile();
          setProfileExists(true);
        } catch (e) {
          if (e.response?.status === 404) setProfileExists(false);
        }
      }
    };

    fetchJobs();
    checkProfile();
  }, [userRole]);

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

  const handleOpenDialog = () => {
    if (!canPostJobs) {
      showSnackbar('Only alumni or admin accounts can share jobs.', 'error');
      return;
    }
    if (userRole === 'alumni' && !profileExists) {
      showSnackbar('Please complete your Alumni Profile before sharing jobs.', 'warning');
      return;
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setJobFormData({
      title: '',
      company: '',
      location: '',
      type: 'Full-time',
      apply_link: '',
      salary: '',
      description: '',
      requirements: '',
    });
    setJobImageFile(null);
  };

  const handleFormChange = (field, value) => {
    setJobFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitJob = async () => {
    if (!canPostJobs) {
      showSnackbar('Only alumni accounts can share jobs.', 'error');
      return;
    }
    try {
      const payload = {
        title: jobFormData.title,
        company: jobFormData.company,
        description: jobFormData.description,
        apply_link: jobFormData.apply_link || '',
        location: jobFormData.location,
        job_type: jobFormData.type,
      };

      if (jobImageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, value);
          }
        });
        formData.append('cover_image_file', jobImageFile);
        await alumniAPI.createJob(formData);
      } else {
        await alumniAPI.createJob(payload);
      }

      showSnackbar('Job posted successfully!', 'success');
      handleCloseDialog();
      
      // Refresh list
      const res = await alumniAPI.getJobs();
      const data = res.data?.jobs || res.data || [];
      setJobs((Array.isArray(data) ? data : []).map(normalizeJob));
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Failed to post job', 'error');
    }
  };

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <PageHeader
            title="Job Board"
            subtitle="Explore career opportunities posted by alumni and partner companies"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={!canPostJobs}
            sx={{ mt: 1 }}
          >
            Share Job
          </Button>
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
              <Grid item xs={12} md={6}>
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} key={job.id}>
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
                    <Grid item xs={12} md={8}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Avatar
                          src={job.logo || undefined}
                          sx={{ width: 64, height: 64 }}
                          variant="rounded"
                        >
                          {!job.logo ? (job.company?.[0] || job.title?.[0] || 'J') : null}
                        </Avatar>
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

                    <Grid item xs={12} md={4}>
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
                        <Button 
                          variant="contained" 
                          fullWidth 
                          size="large"
                          onClick={() => handleApply(job)}
                        >
                          Apply Now
                        </Button>
                        <Button 
                          variant="outlined" 
                          fullWidth 
                          size="small" 
                          sx={{ mt: 1 }}
                          onClick={() => handleSaveToggle(job.id)}
                          color={savedJobIds.includes(job.id) ? 'success' : 'primary'}
                        >
                          {savedJobIds.includes(job.id) ? 'Saved' : 'Save Job'}
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

        {/* Share Job Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Share a Job Opportunity</Typography>
              <Button onClick={handleCloseDialog} size="small" sx={{ minWidth: 'auto' }}>
                <CloseIcon />
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Job Title"
                  required
                  value={jobFormData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  required
                  value={jobFormData.company}
                  onChange={(e) => handleFormChange('company', e.target.value)}
                  placeholder="e.g., Tech Solutions Inc."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  required
                  value={jobFormData.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                  placeholder="e.g., Karachi, Pakistan"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Job Type</InputLabel>
                  <Select
                    value={jobFormData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    label="Job Type"
                  >
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Internship">Internship</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Application Link"
                  value={jobFormData.apply_link}
                  onChange={(e) => handleFormChange('apply_link', e.target.value)}
                  placeholder="https://company.example/apply"
                  helperText="Where students should apply for this job"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Salary Range"
                  value={jobFormData.salary}
                  onChange={(e) => handleFormChange('salary', e.target.value)}
                  placeholder="e.g., 200K - 300K PKR"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Job Description"
                  required
                  multiline
                  rows={4}
                  value={jobFormData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Describe the job responsibilities and expectations..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Requirements"
                  multiline
                  rows={3}
                  value={jobFormData.requirements}
                  onChange={(e) => handleFormChange('requirements', e.target.value)}
                  placeholder="List key requirements (separate by commas)"
                  helperText="e.g., 5+ years experience, React/Node.js, Team leadership"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Optional Job Image / Logo
                </Typography>
                <FileDropzone
                  acceptedTypes="image/*"
                  maxSize={5}
                  onFileSelect={(file) => setJobImageFile(file)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} variant="outlined">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitJob} 
              variant="contained"
              disabled={!jobFormData.title || !jobFormData.company || !jobFormData.location || !jobFormData.description}
            >
              Share Job
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default JobBoard;
