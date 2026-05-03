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
  IconButton,
  CardMedia,
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
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  LinkedIn as LinkedInIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';
import { alumniAPI } from '../../api/alumni';
import { useAuth } from '../../contexts/AuthContext';
import FileDropzone from '../../components/Forms/FileDropzone';

import { useSnackbar } from '../../contexts/SnackbarContext';

const SuccessStories = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const userRole = (user?.role || '').toLowerCase();
  const canShareStories = userRole === 'alumni' || userRole === 'admin';
  
  const [profileExists, setProfileExists] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [storyCoverFile, setStoryCoverFile] = useState(null);
  const [storyFormData, setStoryFormData] = useState({
    achievement: '',
    company: '',
    designation: '',
    category: 'Entrepreneurship',
    story: '',
    tags: '',
  });

  const [stories, setStories] = useState([]);
  const [stats, setStats] = useState([]);

  const handleLike = (storyId) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: s.likes + 1 } : s));
    showSnackbar('Thanks for the appreciation!', 'success');
  };

  const handleConnect = (story) => {
    const linkedIn = story.linkedIn || story.alumni?.linkedin_url;
    if (linkedIn) {
      const url = linkedIn.startsWith('http') ? linkedIn : `https://${linkedIn}`;
      window.open(url, '_blank');
      showSnackbar(`Opening LinkedIn profile of ${story.name}`, 'success');
    } else {
      showSnackbar('No LinkedIn profile available for this alumni.', 'info');
    }
  };

  const normalizeStory = (story) => ({
    id: story.story_id || story.id,
    name: story.name || story.alumni?.name || '',
    program: story.program || story.alumni?.degree || '',
    graduationYear: story.graduationYear || story.alumni?.grad_year || '',
    designation: story.designation || story.alumni?.current_position || '',
    company: story.company || story.alumni?.current_employer || '',
    category: story.category || 'Entrepreneurship',
    story: story.content || story.story || '',
    achievement: story.title || story.achievement || '',
    tags: Array.isArray(story.tags)
      ? story.tags
      : typeof story.tags === 'string'
        ? story.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
    likes: story.likes_count || story.likes || 0,
    comments: story.comments || 0,
    shares: story.shares || 0,
    image: story.cover_image || story.image || '',
    photo: story.photo || story.alumni?.photo_url || '',
  });

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await alumniAPI.getStories();
        const data = res.data?.stories || res.data || [];
        const normalized = (Array.isArray(data) ? data : []).map(normalizeStory);
        setStories(normalized);
        setStats([
          { title: 'Success Stories', value: String(normalized.length), subtitle: 'Published', color: 'primary', icon: TrophyIcon, tooltip: 'Inspiring achievements by our alumni' },
          { title: 'Total Views', value: String(normalized.reduce((s, st) => s + (st.likes || 0), 0)), subtitle: 'Engagements', color: 'success', icon: TrendingUpIcon, tooltip: 'Combined likes across all stories' },
          { title: 'Inspirations', value: String(normalized.reduce((s, st) => s + (st.shares || 0), 0)), subtitle: 'Total shares', color: 'info', icon: StarIcon, tooltip: 'Total appreciation from community' },
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

    fetchStories();
    checkProfile();
  }, [userRole]);

  const handleOpenDialog = () => {
    if (!canShareStories) {
      showSnackbar('Only alumni or admin accounts can share success stories.', 'error');
      return;
    }
    if (userRole === 'alumni' && !profileExists) {
      showSnackbar('Please complete your Alumni Profile before sharing success stories.', 'warning');
      return;
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setStoryFormData({
      achievement: '',
      company: '',
      designation: '',
      category: 'Entrepreneurship',
      story: '',
      tags: '',
    });
    setStoryCoverFile(null);
  };

  const handleFormChange = (field, value) => {
    setStoryFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitStory = async () => {
    if (!canShareStories) {
      showSnackbar('Only alumni accounts can share success stories.', 'warning');
      return;
    }
    if (!storyFormData.achievement || !storyFormData.story) {
      showSnackbar('Please fill all required fields', 'warning');
      return;
    }
    try {
      const payload = {
        title: storyFormData.achievement,
        content: storyFormData.story,
      };

      if (storyCoverFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, value);
          }
        });
        formData.append('cover_image_file', storyCoverFile);
        await alumniAPI.createStory(formData);
      } else {
        await alumniAPI.createStory(payload);
      }

      const res = await alumniAPI.getStories();
      const data = res.data?.stories || res.data || [];
      setStories((Array.isArray(data) ? data : []).map(normalizeStory));
      showSnackbar('Success story submitted!', 'success');
      handleCloseDialog();
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Failed to submit story', 'error');
    }
  };

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.achievement.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || story.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div {...pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <PageHeader
            title="Success Stories"
            subtitle="Get inspired by the remarkable achievements of our alumni"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={!canShareStories}
            sx={{ mt: 1 }}
          >
            Share Story
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4}
 key={index}>
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
                  placeholder="Search stories by name, achievement, or company..."
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
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    <MenuItem value="Entrepreneurship">Entrepreneurship</MenuItem>
                    <MenuItem value="Technology">Technology</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="Research">Research</MenuItem>
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Social Impact">Social Impact</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Success Stories Grid */}
        <Grid container spacing={3}>
          {filteredStories.map((story) => (
            <Grid item xs={12} md={6} key={story.id}>
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
                {/* Story Image */}
                {story.image ? (
                  <CardMedia
                    component="img"
                    height="240"
                    image={story.image}
                    alt={story.achievement}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 240,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(255,193,7,0.2), rgba(255,193,7,0.06))',
                    }}
                  >
                    <TrophyIcon sx={{ fontSize: 72, color: 'warning.main', opacity: 0.75 }} />
                  </Box>
                )}

                <CardContent>
                  {/* Header with Avatar */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Avatar
                      src={story.photo}
                      sx={{ width: 64, height: 64 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {story.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {story.program} • Class of {story.graduationYear}
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight={600}>
                        {story.designation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {story.company}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Category Badge */}
                  <Chip
                    label={story.category}
                    size="small"
                    color="primary"
                    sx={{ mb: 2 }}
                  />

                  {/* Achievement */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'action.hover',
                      borderRadius: 2,
                      mb: 2,
                      borderLeft: 4,
                      borderColor: 'primary.main',
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" color="primary" gutterBottom>
                      Achievement
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {story.achievement}
                    </Typography>
                  </Paper>

                  {/* Story */}
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {story.story}
                  </Typography>

                  {/* Tags */}
                  <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
                    {story.tags.map((tag, idx) => (
                      <Chip key={idx} label={tag} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                    ))}
                  </Stack>

                  {/* Engagement Stats & Actions */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" color="error" onClick={() => handleLike(story.id)}>
                          <FavoriteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" fontWeight={600}>
                          {story.likes}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" color="primary">
                          <CommentIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" fontWeight={600}>
                          {story.comments}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" color="success">
                          <ShareIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" fontWeight={600}>
                          {story.shares}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LinkedInIcon />}
                      onClick={() => handleConnect(story)}
                    >
                      Connect
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredStories.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <TrophyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No success stories found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search terms
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Share Success Story Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Share Your Success Story</Typography>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Achievement Title"
                  required
                  value={storyFormData.achievement}
                  onChange={(e) => handleFormChange('achievement', e.target.value)}
                  placeholder="e.g., Founded Tech Startup Valued at $10M"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Company/Organization"
                  value={storyFormData.company}
                  onChange={(e) => handleFormChange('company', e.target.value)}
                  placeholder="e.g., InnovateTech"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Current Designation"
                  value={storyFormData.designation}
                  onChange={(e) => handleFormChange('designation', e.target.value)}
                  placeholder="e.g., CEO & Founder"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={storyFormData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="Entrepreneurship">Entrepreneurship</MenuItem>
                    <MenuItem value="Technology">Technology</MenuItem>
                    <MenuItem value="Business">Business</MenuItem>
                    <MenuItem value="Research">Research</MenuItem>
                    <MenuItem value="Engineering">Engineering</MenuItem>
                    <MenuItem value="Social Impact">Social Impact</MenuItem>
                    <MenuItem value="Healthcare">Healthcare</MenuItem>
                    <MenuItem value="Education">Education</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Your Success Story"
                  required
                  multiline
                  rows={6}
                  value={storyFormData.story}
                  onChange={(e) => handleFormChange('story', e.target.value)}
                  placeholder="Share your journey, challenges you overcame, and what you achieved. Inspire fellow students and alumni..."
                  helperText="Be detailed and authentic. Your story will inspire current students and fellow alumni."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags"
                  value={storyFormData.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  placeholder="e.g., Startup, Leadership, Innovation"
                  helperText="Add relevant tags separated by commas"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Optional Story Image
                </Typography>
                <FileDropzone
                  acceptedTypes="image/*"
                  maxSize={5}
                  onFileSelect={(file) => setStoryCoverFile(file)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} variant="outlined">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitStory} 
              variant="contained"
              disabled={!storyFormData.achievement || !storyFormData.story}
            >
              Share Story
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default SuccessStories;
