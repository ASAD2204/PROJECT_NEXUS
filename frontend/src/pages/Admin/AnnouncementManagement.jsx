import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Campaign,
  People,
  Schedule,
  Check,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition } from '../../utils/animations';
import { opsAPI } from '../../api/ops';

const AnnouncementManagement = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    priority: 'normal',
    publishNow: true,
    scheduledDate: '',
    scheduledTime: '',
    expiryDate: '',
  });

  const [announcements, setAnnouncements] = useState([]);

  const normalizeAnnouncement = (a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    targetAudience: Array.isArray(a.target_audience) ? (a.target_audience[0] || 'all') : (a.targetAudience || 'all'),
    priority: (a.priority || 'normal').toLowerCase(),
    status: a.status || 'published',
    publishedDate: a.published_at ? a.published_at.split('T')[0] : (a.publishedDate || '-'),
    publishedBy: a.author_id || a.publishedBy || 'Admin',
    views: a.view_count || a.views || 0,
    isPinned: Boolean(a.is_pinned),
  });

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await opsAPI.getAnnouncements();
      const rows = res.data?.announcements || res.data || [];
      setAnnouncements((Array.isArray(rows) ? rows : []).map(normalizeAnnouncement));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddAnnouncement = () => {
    setEditMode(false);
    setFormData({
      title: '',
      content: '',
      targetAudience: 'all',
      priority: 'normal',
      publishNow: true,
      scheduledDate: '',
      scheduledTime: '',
      expiryDate: '',
    });
    setOpenDialog(true);
  };

  const handleSaveAnnouncement = async () => {
    try {
      await opsAPI.createAnnouncement({
        title: formData.title,
        content: formData.content,
        target_audience: [formData.targetAudience || 'all'],
        priority: formData.priority || 'normal',
        is_pinned: false,
        attachments: [],
      });
      await loadAnnouncements();
      setOpenDialog(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await opsAPI.deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      case 'draft': return 'default';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAudienceLabel = (audience) => {
    switch (audience) {
      case 'all': return 'Everyone';
      case 'students': return 'Students';
      case 'faculty': return 'Faculty';
      case 'alumni': return 'Alumni';
      case 'staff': return 'Staff';
      default: return audience;
    }
  };

  const stats = [
    {
      title: 'Total Announcements',
      value: announcements.length,
      icon: Campaign,
      color: 'primary',
      subtitle: `${announcements.filter(a => a.status === 'published').length} published`,
    },
    {
      title: 'Total Views',
      value: announcements.reduce((sum, a) => sum + a.views, 0).toLocaleString(),
      icon: Visibility,
      color: 'success',
      subtitle: 'Across all announcements',
    },
    {
      title: 'Scheduled',
      value: announcements.filter(a => a.status === 'scheduled').length,
      icon: Schedule,
      color: 'warning',
      subtitle: 'Awaiting publication',
    },
    {
      title: 'Drafts',
      value: announcements.filter(a => a.status === 'draft').length,
      icon: Edit,
      color: 'info',
      subtitle: 'In progress',
    },
  ];

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Announcement Management"
          subtitle="Create and manage system-wide announcements"
          icon={Campaign}
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Action Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight="bold">
                All Announcements
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={handleAddAnnouncement}
                sx={{ minWidth: { xs: '100%', sm: 160 }, mt: { xs: 1, sm: 0 } }}
              >
                Create Announcement
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Announcements Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Audience</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Published Date</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600">
                        {announcement.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {announcement.content.substring(0, 80)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getAudienceLabel(announcement.targetAudience)}
                        size="small"
                        icon={<People sx={{ fontSize: 16 }} />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={announcement.priority}
                        size="small"
                        color={getPriorityColor(announcement.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={announcement.status}
                        size="small"
                        color={getStatusColor(announcement.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {announcement.publishedDate || announcement.scheduledDate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600">
                        {announcement.views.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary">
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary">
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Create/Edit Announcement Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Campaign />
              </Avatar>
              <Typography variant="h6" fontWeight="bold">
                {editMode ? 'Edit Announcement' : 'Create New Announcement'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Announcement Title"
                fullWidth
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter announcement title"
              />

              <TextField
                label="Content"
                fullWidth
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter announcement content..."
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Target Audience</InputLabel>
                    <Select
                      value={formData.targetAudience}
                      label="Target Audience"
                      onChange={(e) => handleChange('targetAudience', e.target.value)}
                    >
                      <MenuItem value="all">Everyone</MenuItem>
                      <MenuItem value="students">Students Only</MenuItem>
                      <MenuItem value="faculty">Faculty Only</MenuItem>
                      <MenuItem value="alumni">Alumni Only</MenuItem>
                      <MenuItem value="staff">Staff Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority}
                      label="Priority"
                      onChange={(e) => handleChange('priority', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.publishNow}
                    onChange={(e) => handleChange('publishNow', e.target.checked)}
                  />
                }
                label="Publish immediately"
              />

              {!formData.publishNow && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Schedule Date"
                      type="date"
                      fullWidth
                      value={formData.scheduledDate}
                      onChange={(e) => handleChange('scheduledDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Schedule Time"
                      type="time"
                      fullWidth
                      value={formData.scheduledTime}
                      onChange={(e) => handleChange('scheduledTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              )}

              <TextField
                label="Expiry Date (Optional)"
                type="date"
                fullWidth
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Announcement will be automatically archived after this date"
              />

              <Alert severity="info" icon={<Campaign />}>
                This announcement will be visible to {getAudienceLabel(formData.targetAudience).toLowerCase()} on their dashboard and notifications page.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              startIcon={formData.publishNow ? <Check /> : <Schedule />}
              onClick={handleSaveAnnouncement}
              disabled={!formData.title || !formData.content}
            >
              {formData.publishNow ? 'Publish Now' : 'Schedule'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default AnnouncementManagement;
