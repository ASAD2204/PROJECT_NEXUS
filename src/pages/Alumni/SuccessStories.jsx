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

const SuccessStories = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [storyFormData, setStoryFormData] = useState({
    achievement: '',
    company: '',
    designation: '',
    category: 'Entrepreneurship',
    story: '',
    tags: '',
  });

  // Mock success stories
  const stories = [
    {
      id: 1,
      name: 'Ali Hassan',
      photo: 'https://i.pravatar.cc/150?img=21',
      graduationYear: 2018,
      program: 'BS Computer Science',
      achievement: 'Founded Tech Startup Valued at $10M',
      company: 'InnovateTech',
      designation: 'CEO & Founder',
      category: 'Entrepreneurship',
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
      story: 'Started InnovateTech from dorm room, now serving 10,000+ clients across Pakistan. The entrepreneurial skills learned at university helped me take the leap.',
      likes: 245,
      comments: 32,
      shares: 18,
      tags: ['Startup', 'Technology', 'Leadership'],
    },
    {
      id: 2,
      name: 'Sana Ahmed',
      photo: 'https://i.pravatar.cc/150?img=22',
      graduationYear: 2015,
      program: 'BS Software Engineering',
      achievement: 'Senior Engineering Manager at Google',
      company: 'Google',
      designation: 'Senior Engineering Manager',
      category: 'Technology',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
      story: 'Joined Google as SDE-1 in 2016, promoted to manager in 2019. Now leading a team of 25 engineers working on Google Cloud Platform.',
      likes: 312,
      comments: 45,
      shares: 28,
      tags: ['Google', 'Leadership', 'Cloud'],
    },
    {
      id: 3,
      name: 'Omar Khan',
      photo: 'https://i.pravatar.cc/150?img=23',
      graduationYear: 2012,
      program: 'MBA',
      achievement: 'Youngest VP at Fortune 500 Company',
      company: 'Unilever',
      designation: 'Vice President - Marketing',
      category: 'Business',
      image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800',
      story: 'Became the youngest VP at Unilever Pakistan at age 32. Leading marketing strategies for 15+ brands with $200M annual revenue.',
      likes: 198,
      comments: 28,
      shares: 15,
      tags: ['Marketing', 'Leadership', 'Corporate'],
    },
    {
      id: 4,
      name: 'Fatima Zahra',
      photo: 'https://i.pravatar.cc/150?img=24',
      graduationYear: 2016,
      program: 'BS Data Science',
      achievement: 'Published Research in Nature Journal',
      company: 'MIT',
      designation: 'Research Scientist',
      category: 'Research',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
      story: 'Published groundbreaking research on AI in healthcare. Now pursuing PhD at MIT while collaborating with leading hospitals.',
      likes: 267,
      comments: 38,
      shares: 42,
      tags: ['Research', 'AI', 'Healthcare'],
    },
    {
      id: 5,
      name: 'Ahmed Raza',
      photo: 'https://i.pravatar.cc/150?img=25',
      graduationYear: 2014,
      program: 'BS Civil Engineering',
      achievement: 'Led $500M Infrastructure Project',
      company: 'FWO',
      designation: 'Project Director',
      category: 'Engineering',
      image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
      story: 'Managed the construction of 100km highway connecting major cities. Project completed ahead of schedule and under budget.',
      likes: 189,
      comments: 21,
      shares: 12,
      tags: ['Infrastructure', 'Engineering', 'Leadership'],
    },
    {
      id: 6,
      name: 'Ayesha Malik',
      photo: 'https://i.pravatar.cc/150?img=26',
      graduationYear: 2017,
      program: 'BS Business Administration',
      achievement: 'Built NGO Impacting 50,000 Lives',
      company: 'EduCare Foundation',
      designation: 'Founder & Director',
      category: 'Social Impact',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
      story: 'Founded NGO providing free education to underprivileged children. Now operating 20 schools across rural Pakistan.',
      likes: 421,
      comments: 67,
      shares: 89,
      tags: ['Education', 'NGO', 'Social Impact'],
    },
  ];

  const stats = [
    { 
      title: 'Success Stories', 
      value: '78', 
      subtitle: '+12 new', 
      color: 'primary', 
      icon: TrophyIcon,
      tooltip: 'Inspiring achievements by our alumni. Stories include entrepreneurship, research breakthroughs, and leadership roles'
    },
    { 
      title: 'Total Views', 
      value: '12.5K', 
      subtitle: '+2.3K this month', 
      color: 'success', 
      icon: TrendingUpIcon,
      tooltip: 'Combined views across all success stories. These stories inspire and guide current students in their career paths'
    },
    { 
      title: 'Inspirations', 
      value: '1.2K', 
      subtitle: 'Total likes', 
      color: 'info', 
      icon: StarIcon,
      tooltip: 'Total appreciation from community. React to stories that resonate with you and share with fellow students'
    },
  ];

  const handleOpenDialog = () => {
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
  };

  const handleFormChange = (field, value) => {
    setStoryFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitStory = () => {
    if (!storyFormData.achievement || !storyFormData.story) {
      alert('Please fill all required fields');
      return;
    }
    // Here you would typically send the data to your backend
    console.log('Submitting story:', storyFormData);
    alert('Success story submitted! It will be reviewed before publishing.');
    handleCloseDialog();
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
            sx={{ mt: 1 }}
          >
            Share Story
          </Button>
        </Box>

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
              <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 6 }} key={story.id}>
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
                <CardMedia
                  component="img"
                  height="240"
                  image={story.image}
                  alt={story.achievement}
                  sx={{ objectFit: 'cover' }}
                />

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
                        <IconButton size="small" color="error">
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
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Achievement Title"
                  required
                  value={storyFormData.achievement}
                  onChange={(e) => handleFormChange('achievement', e.target.value)}
                  placeholder="e.g., Founded Tech Startup Valued at $10M"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Current Company/Organization"
                  value={storyFormData.company}
                  onChange={(e) => handleFormChange('company', e.target.value)}
                  placeholder="e.g., InnovateTech"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Current Designation"
                  value={storyFormData.designation}
                  onChange={(e) => handleFormChange('designation', e.target.value)}
                  placeholder="e.g., CEO & Founder"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
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
              <Grid size={{ xs: 12 }}>
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
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Tags"
                  value={storyFormData.tags}
                  onChange={(e) => handleFormChange('tags', e.target.value)}
                  placeholder="e.g., Startup, Leadership, Innovation"
                  helperText="Add relevant tags separated by commas"
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
