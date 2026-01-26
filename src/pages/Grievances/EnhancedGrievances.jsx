import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  TextField,
  Chip,
  Avatar,
  Grid,
  Divider,
  alpha,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Report,
  FileUpload,
  CheckCircle,
  Schedule,
  Warning,
  Close,
  Send,
  AttachFile,
  Delete,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { pageTransition } from '../../utils/animations';

const EnhancedGrievances = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [newGrievance, setNewGrievance] = useState({
    category: '',
    priority: '',
    subject: '',
    description: '',
    attachments: [],
  });

  const grievances = [
    {
      id: 'GRV-2026-001',
      subject: 'Fee Portal Not Working',
      category: 'Finance',
      priority: 'high',
      status: 'in-progress',
      submittedDate: 'Jan 20, 2026',
      lastUpdate: 'Jan 23, 2026',
      department: 'Finance Office',
      timeline: [
        { date: 'Jan 20, 2026 10:30 AM', status: 'Submitted', note: 'Grievance submitted' },
        { date: 'Jan 20, 2026 02:15 PM', status: 'Acknowledged', note: 'Assigned to Finance Office' },
        { date: 'Jan 23, 2026 11:00 AM', status: 'In Progress', note: 'IT team investigating the issue' },
      ],
      attachments: [
        { name: 'error_screenshot.png', size: '245 KB' },
      ],
    },
    {
      id: 'GRV-2026-002',
      subject: 'Library Book Not Available',
      category: 'Library',
      priority: 'medium',
      status: 'resolved',
      submittedDate: 'Jan 18, 2026',
      lastUpdate: 'Jan 22, 2026',
      department: 'Library',
      resolution: 'Book has been ordered and will be available next week.',
      timeline: [
        { date: 'Jan 18, 2026 09:00 AM', status: 'Submitted', note: 'Grievance submitted' },
        { date: 'Jan 18, 2026 03:30 PM', status: 'Acknowledged', note: 'Assigned to Library' },
        { date: 'Jan 22, 2026 10:15 AM', status: 'Resolved', note: 'Book ordered' },
      ],
      attachments: [],
    },
    {
      id: 'GRV-2026-003',
      subject: 'Classroom AC Not Working',
      category: 'Operations',
      priority: 'urgent',
      status: 'new',
      submittedDate: 'Jan 24, 2026',
      lastUpdate: 'Jan 24, 2026',
      department: 'Operations',
      timeline: [
        { date: 'Jan 24, 2026 08:45 AM', status: 'Submitted', note: 'Grievance submitted' },
      ],
      attachments: [],
    },
  ];

  const categories = [
    'Academic',
    'Finance',
    'Library',
    'Operations',
    'IT Support',
    'Administration',
    'Hostel',
    'Transport',
    'Other',
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'default' },
    { value: 'medium', label: 'Medium', color: 'info' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'urgent', label: 'Urgent', color: 'error' },
  ];

  const statuses = [
    { value: 'new', label: 'New', color: 'primary', icon: <AssignmentIcon /> },
    { value: 'acknowledged', label: 'Acknowledged', color: 'info', icon: <CheckCircle /> },
    { value: 'in-progress', label: 'In Progress', color: 'warning', icon: <Schedule /> },
    { value: 'resolved', label: 'Resolved', color: 'success', icon: <CheckCircle /> },
    { value: 'closed', label: 'Closed', color: 'default', icon: <Close /> },
  ];

  const getStatusInfo = (status) => {
    return statuses.find((s) => s.value === status) || statuses[0];
  };

  const getPriorityInfo = (priority) => {
    return priorities.find((p) => p.value === priority) || priorities[0];
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setNewGrievance({
      ...newGrievance,
      attachments: [...newGrievance.attachments, ...files],
    });
  };

  const handleRemoveFile = (index) => {
    setNewGrievance({
      ...newGrievance,
      attachments: newGrievance.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmitGrievance = () => {
    console.log('Submitting grievance:', newGrievance);
    setOpenDialog(false);
    setNewGrievance({
      category: '',
      priority: '',
      subject: '',
      description: '',
      attachments: [],
    });
  };

  const handleViewDetails = (grievance) => {
    setSelectedGrievance(grievance);
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageTransition}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Grievance Management
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Submit and track your grievances
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<Report />}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
            }}
            onClick={() => setOpenDialog(true)}
          >
            File New Grievance
          </Button>
        </Paper>

        {!selectedGrievance ? (
          /* Grievance List */
          <Grid container spacing={3}>
            {grievances.map((grievance) => {
              const statusInfo = getStatusInfo(grievance.status);
              const priorityInfo = getPriorityInfo(grievance.priority);
              
              return (
                <Grid size={{ xs: 12 }} key={grievance.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: theme.shadows[4],
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            label={grievance.id}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={grievance.category}
                            size="small"
                            color="primary"
                          />
                          <Chip
                            label={priorityInfo.label}
                            size="small"
                            color={priorityInfo.color}
                          />
                        </Stack>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {grievance.subject}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Submitted: {grievance.submittedDate} • Last Update: {grievance.lastUpdate}
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end" spacing={1}>
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          color={statusInfo.color}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewDetails(grievance)}
                        >
                          View Details
                        </Button>
                      </Stack>
                    </Box>

                    {grievance.attachments.length > 0 && (
                      <Stack direction="row" spacing={1}>
                        <AttachFile sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {grievance.attachments.length} attachment(s)
                        </Typography>
                      </Stack>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          /* Grievance Details */
          <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
            <Button
              size="small"
              onClick={() => setSelectedGrievance(null)}
              sx={{ mb: 3 }}
            >
              ← Back to List
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={selectedGrievance.id} variant="outlined" />
                  <Chip label={selectedGrievance.category} color="primary" />
                  <Chip
                    label={getPriorityInfo(selectedGrievance.priority).label}
                    color={getPriorityInfo(selectedGrievance.priority).color}
                  />
                </Stack>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {selectedGrievance.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Department: {selectedGrievance.department}
                </Typography>
              </Box>
              <Chip
                icon={getStatusInfo(selectedGrievance.status).icon}
                label={getStatusInfo(selectedGrievance.status).label}
                color={getStatusInfo(selectedGrievance.status).color}
                size="large"
              />
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Timeline */}
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Timeline
            </Typography>
            <Box sx={{ position: 'relative', pl: 4, pb: 3 }}>
              {selectedGrievance.timeline.map((event, index) => (
                <Box key={index} sx={{ position: 'relative', pb: 3 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -27,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor:
                        index === selectedGrievance.timeline.length - 1
                          ? 'primary.main'
                          : 'success.main',
                      border: `3px solid ${theme.palette.background.paper}`,
                      boxShadow: `0 0 0 2px ${
                        index === selectedGrievance.timeline.length - 1
                          ? theme.palette.primary.main
                          : theme.palette.success.main
                      }`,
                    }}
                  />
                  {index < selectedGrievance.timeline.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -22,
                        top: 16,
                        width: 2,
                        height: 'calc(100% + 12px)',
                        bgcolor: alpha(theme.palette.divider, 0.3),
                      }}
                    />
                  )}
                  <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                    <Typography variant="subtitle2" fontWeight={600} color="primary">
                      {event.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {event.date}
                    </Typography>
                    <Typography variant="body2">{event.note}</Typography>
                  </Paper>
                </Box>
              ))}
            </Box>

            {selectedGrievance.resolution && (
              <>
                <Divider sx={{ mb: 3 }} />
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  }}
                >
                  <Typography variant="h6" fontWeight={600} color="success.main" gutterBottom>
                    Resolution
                  </Typography>
                  <Typography variant="body1">{selectedGrievance.resolution}</Typography>
                </Paper>
              </>
            )}

            {selectedGrievance.attachments.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Attachments
                </Typography>
                <Stack spacing={1}>
                  {selectedGrievance.attachments.map((file, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <AttachFile color="primary" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.size}
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined">
                        Download
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        )}

        {/* New Grievance Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              File New Grievance
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={newGrievance.category}
                      label="Category"
                      onChange={(e) =>
                        setNewGrievance({ ...newGrievance, category: e.target.value })
                      }
                    >
                      {categories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={newGrievance.priority}
                      label="Priority"
                      onChange={(e) =>
                        setNewGrievance({ ...newGrievance, priority: e.target.value })
                      }
                    >
                      {priorities.map((p) => (
                        <MenuItem key={p.value} value={p.value}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Subject"
                value={newGrievance.subject}
                onChange={(e) =>
                  setNewGrievance({ ...newGrievance, subject: e.target.value })
                }
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Description"
                placeholder="Describe your grievance in detail..."
                value={newGrievance.description}
                onChange={(e) =>
                  setNewGrievance({ ...newGrievance, description: e.target.value })
                }
              />

              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<FileUpload />}
                  fullWidth
                >
                  Upload Attachments
                  <input type="file" hidden multiple onChange={handleFileUpload} />
                </Button>
                {newGrievance.attachments.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {newGrievance.attachments.map((file, index) => (
                      <Paper
                        key={index}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: alpha(theme.palette.success.main, 0.05),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachFile fontSize="small" color="success" />
                          <Typography variant="body2">{file.name}</Typography>
                        </Box>
                        <Button size="small" color="error" onClick={() => handleRemoveFile(index)}>
                          <Delete fontSize="small" />
                        </Button>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGrievance}
              variant="contained"
              startIcon={<Send />}
              disabled={
                !newGrievance.category ||
                !newGrievance.priority ||
                !newGrievance.subject ||
                !newGrievance.description
              }
            >
              Submit Grievance
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default EnhancedGrievances;
