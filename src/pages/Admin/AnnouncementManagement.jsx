import React, { useState } from 'react';
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

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: 'Mid-Term Examination Schedule Released',
      content: 'The mid-term examination schedule for Fall 2025 has been released. Please check your student portal for detailed timings and venues.',
      targetAudience: 'students',
      priority: 'high',
      status: 'published',
      publishedDate: '2026-01-20',
      publishedBy: 'Admin User',
      views: 1250,
      expiryDate: '2026-02-15',
    },
    {
      id: 2,
      title: 'Faculty Development Workshop',
      content: 'A workshop on "Modern Teaching Methodologies" will be conducted on January 30th, 2026. All faculty members are requested to attend.',
      targetAudience: 'faculty',
      priority: 'normal',
      status: 'published',
      publishedDate: '2026-01-18',
      publishedBy: 'Admin User',
      views: 85,
      expiryDate: '2026-01-30',
    },
    {
      id: 3,
      title: 'Library Timings Extended',
      content: 'Library will remain open until 10 PM during examination week to facilitate students.',
      targetAudience: 'all',
      priority: 'normal',
      status: 'scheduled',
      scheduledDate: '2026-01-28',
      publishedBy: 'Admin User',
      views: 0,
      expiryDate: '2026-02-10',
    },
    {
      id: 4,
      title: 'Alumni Networking Event',
      content: 'Join us for our annual alumni networking event on February 5th. Register on the alumni portal.',
      targetAudience: 'alumni',
      priority: 'high',
      status: 'draft',
      publishedBy: 'Admin User',
      views: 0,
      expiryDate: '2026-02-05',
    },
  ]);

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

  const handleSaveAnnouncement = () => {
    const newAnnouncement = {
      id: announcements.length + 1,
      ...formData,
      status: formData.publishNow ? 'published' : 'scheduled',
      publishedDate: formData.publishNow ? new Date().toISOString().split('T')[0] : formData.scheduledDate,
      publishedBy: 'Admin User',
      views: 0,
    };
    setAnnouncements([...announcements, newAnnouncement]);
    setOpenDialog(false);
  };

  const handleDeleteAnnouncement = (id) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
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
