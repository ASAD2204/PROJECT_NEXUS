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
  const [viewMode, setViewMode] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
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
    publishedBy: a.author_name || a.author_id || a.publishedBy || 'Admin',
    authorAvatar: a.author_avatar,
    views: a.view_count || a.views || 0,
    isPinned: Boolean(a.is_pinned),
    targetPrograms: Array.isArray(a.target_programs) ? a.target_programs : [],
    targetSemesters: Array.isArray(a.target_semesters) ? a.target_semesters : [],
    attachments: Array.isArray(a.attachments) ? a.attachments : [],
    expiresAt: a.expires_at || a.expiresAt || '',
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

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setViewMode(false);
    setSelectedAnnouncement(null);
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
  };

  const handleAddAnnouncement = () => {
    setEditMode(false);
    setViewMode(false);
    setSelectedAnnouncement(null);
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

  const handleOpenAnnouncement = async (announcement, mode = 'view') => {
    try {
      setEditMode(mode === 'edit');
      setViewMode(mode === 'view');

      let source = announcement;
      if (mode === 'view') {
        const res = await opsAPI.getAnnouncement(announcement.id);
        source = res.data?.announcement || res.data || announcement;
      }

      const normalized = normalizeAnnouncement(source);
      setSelectedAnnouncement(normalized);
      setFormData({
        title: normalized.title || '',
        content: normalized.content || '',
        targetAudience: normalized.targetAudience || 'all',
        priority: normalized.priority || 'normal',
        publishNow: true,
        scheduledDate: '',
        scheduledTime: '',
        expiryDate: normalized.expiresAt || '',
      });
      setOpenDialog(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAnnouncement = async () => {
    const hasTitle = Boolean(formData.title?.trim());
    const hasContent = Boolean(formData.content?.trim());
    const hasSchedule = formData.publishNow || (Boolean(formData.scheduledDate) && Boolean(formData.scheduledTime));
    if (!hasTitle || !hasContent || !hasSchedule) {
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        target_audience: [formData.targetAudience || 'all'],
        priority: formData.priority || 'normal',
        is_pinned: selectedAnnouncement?.isPinned || false,
        target_programs: selectedAnnouncement?.targetPrograms?.length ? selectedAnnouncement.targetPrograms : null,
        target_semesters: selectedAnnouncement?.targetSemesters?.length ? selectedAnnouncement.targetSemesters : null,
        attachments: selectedAnnouncement?.attachments || [],
        expires_at: formData.expiryDate || null,
      };

      if (editMode && selectedAnnouncement?.id) {
        await opsAPI.updateAnnouncement(selectedAnnouncement.id, payload);
      } else {
        await opsAPI.createAnnouncement(payload);
      }

      await loadAnnouncements();
      handleCloseDialog();
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
                        <IconButton size="small" color="primary" onClick={() => handleOpenAnnouncement(announcement, 'view')}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleOpenAnnouncement(announcement, 'edit')}>
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
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Campaign />
              </Avatar>
              <Typography variant="h6" fontWeight="bold">
                {viewMode ? 'Announcement Details' : editMode ? 'Edit Announcement' : 'Create New Announcement'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Announcement Title"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter announcement title"
                inputProps={{ maxLength: 150 }}
                disabled={viewMode}
              />

              <TextField
                label="Content"
                fullWidth
                required
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter announcement content..."
                inputProps={{ minLength: 10, maxLength: 5000 }}
                disabled={viewMode}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Target Audience</InputLabel>
                    <Select
                      value={formData.targetAudience}
                      label="Target Audience"
                      onChange={(e) => handleChange('targetAudience', e.target.value)}
                      disabled={viewMode}
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
                      disabled={viewMode}
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
                    disabled={viewMode}
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
                      required
                      value={formData.scheduledDate}
                      onChange={(e) => handleChange('scheduledDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={viewMode}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Schedule Time"
                      type="time"
                      fullWidth
                      required
                      value={formData.scheduledTime}
                      onChange={(e) => handleChange('scheduledTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={viewMode}
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
                disabled={viewMode}
              />

              <Alert severity="info" icon={<Campaign />}>
                This announcement will be visible to {getAudienceLabel(formData.targetAudience).toLowerCase()} on their dashboard and notifications page.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog}>{viewMode ? 'Close' : 'Cancel'}</Button>
            {!viewMode && (
              <Button 
                variant="contained" 
                startIcon={formData.publishNow ? <Check /> : <Schedule />}
                onClick={handleSaveAnnouncement}
                disabled={!formData.title?.trim() || !formData.content?.trim() || (!formData.publishNow && (!formData.scheduledDate || !formData.scheduledTime))}
              >
                {editMode ? 'Save Changes' : (formData.publishNow ? 'Publish Now' : 'Schedule')}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default AnnouncementManagement;
