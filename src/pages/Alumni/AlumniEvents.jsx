import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  IconButton,
  Stack,
  Divider,
  Avatar,
  AvatarGroup,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Event,
  LocationOn,
  AccessTime,
  People,
  CheckCircle,
  AttachMoney,
  Close,
  CalendarMonth,
  PersonAdd,
  EmojiEvents,
  VideoCall,
  BusinessCenter,
  School,
  History,
  Add,
} from '@mui/icons-material';
import { alumniEvents, registerForEvent } from '../../data/dummyData';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import PageTransition from '../../components/Common/PageTransition';
import EmptyState from '../../components/Common/EmptyState';
import { CardSkeleton } from '../../components/Common/LoadingSkeleton';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const AlumniEvents = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationDialog, setRegistrationDialog] = useState(false);
  const [organizeDialog, setOrganizeDialog] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    fullName: '',
    email: '',
    phone: '',
    graduationYear: '',
  });
  const [eventFormData, setEventFormData] = useState({
    title: '',
    type: 'Reunion',
    date: '',
    time: '',
    venue: '',
    capacity: '',
    fee: '',
    description: '',
    speakers: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRegister = (event) => {
    setSelectedEvent(event);
    setRegistrationDialog(true);
  };

  const handleSubmitRegistration = () => {
    if (!registrationData.fullName || !registrationData.email) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }

    const result = registerForEvent(selectedEvent.id);
    if (result.success) {
      showSnackbar(result.message, 'success');
      setRegistrationDialog(false);
      setRegistrationData({ fullName: '', email: '', phone: '', graduationYear: '' });
    } else {
      showSnackbar(result.message, 'error');
    }
  };

  const handleOpenOrganizeDialog = () => {
    setOrganizeDialog(true);
  };

  const handleCloseOrganizeDialog = () => {
    setOrganizeDialog(false);
    setEventFormData({
      title: '',
      type: 'Reunion',
      date: '',
      time: '',
      venue: '',
      capacity: '',
      fee: '',
      description: '',
      speakers: '',
    });
  };

  const handleEventFormChange = (field, value) => {
    setEventFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitEvent = () => {
    if (!eventFormData.title || !eventFormData.date || !eventFormData.time || !eventFormData.venue) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    // Here you would typically send the data to your backend
    console.log('Organizing event:', eventFormData);
    showSnackbar('Event created successfully! It will be reviewed by admin.', 'success');
    handleCloseOrganizeDialog();
  };

  const upcomingEvents = alumniEvents.filter((e) => e.status === 'Upcoming');
  const pastEvents = alumniEvents.filter((e) => e.status === 'Completed');

  const getEventIcon = (type) => {
    switch (type) {
      case 'Reunion':
        return <People />;
      case 'Career Fair':
        return <BusinessCenter />;
      case 'Workshop':
        return <School />;
      case 'Webinar':
        return <VideoCall />;
      case 'Sports':
        return <EmojiEvents />;
      default:
        return <Event />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'Reunion':
        return 'primary';
      case 'Career Fair':
        return 'success';
      case 'Workshop':
        return 'warning';
      case 'Webinar':
        return 'info';
      case 'Sports':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="Alumni Events" subtitle="Loading events..." />
        <CardSkeleton count={3} />
      </Box>
    );
  }

  return (
    <PageTransition>
      <Box className="page-container">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <PageHeader
            title="Alumni Events"
            subtitle="Stay connected through reunions, workshops, and networking events"
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={handleOpenOrganizeDialog}
            sx={{ 
              mt: 1,
              minWidth: { xs: '100%', sm: 140 }
            }}
          >
            Organize Event
          </Button>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              title="Upcoming Events"
              value={upcomingEvents.length}
              icon={Event}
              color="primary"
              tooltip="Events scheduled for the future. Includes reunions, career fairs, workshops, webinars, and networking sessions"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              title="Total Registrations"
              value={alumniEvents.reduce((sum, e) => sum + e.registered, 0)}
              icon={People}
              color="success"
              tooltip="Total participants registered across all events. Shows engagement level of alumni and students in university activities"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              title="Past Events"
              value={pastEvents.length}
              icon={History}
              color="info"
              tooltip="Successfully completed events. Browse past events to see highlights and recordings from previous sessions"
            />
          </Grid>
        </Grid>

        {/* Upcoming Events */}
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Upcoming Events
        </Typography>
        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon="events"
            title="No Upcoming Events"
            message="Check back later for new events"
          />
        ) : (
          <Grid
            container
            spacing={3}
            sx={{ mb: 4 }}
            component={motion.div}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {upcomingEvents.map((event) => {
              const spotsLeft = event.capacity - event.registered;
              const fillPercentage = (event.registered / event.capacity) * 100;

              return (
                <Grid size={{ xs: 12, md: 6 }} key={event.id} component={motion.div} variants={fadeInUp}>
                  <Card
                    sx={{
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6,
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={event.coverImage}
                      alt={event.title}
                      sx={{ filter: 'brightness(0.85)' }}
                    />
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip
                          icon={getEventIcon(event.type)}
                          label={event.type}
                          color={getEventColor(event.type)}
                          size="small"
                        />
                        {event.fee > 0 ? (
                          <Chip
                            icon={<AttachMoney />}
                            label={`PKR ${event.fee.toLocaleString()}`}
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip label="FREE" color="success" size="small" />
                        )}
                      </Box>

                      {/* Title and Description */}
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {event.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {event.description}
                      </Typography>

                      <Divider sx={{ my: 2 }} />

                      {/* Event Details */}
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonth fontSize="small" color="action" />
                          <Typography variant="body2">
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="body2">{event.time}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">{event.venue}</Typography>
                        </Box>
                      </Stack>

                      {/* Speakers */}
                      {event.speakers && event.speakers.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                            Featured Speakers:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {event.speakers.map((speaker, index) => (
                              <Chip key={index} label={speaker} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Registration Progress */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {event.registered} / {event.capacity} Registered
                          </Typography>
                          <Typography variant="caption" fontWeight="bold" color={spotsLeft < 50 ? 'error' : 'primary'}>
                            {spotsLeft} spots left
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={fillPercentage}
                          sx={{ height: 8, borderRadius: 1 }}
                          color={fillPercentage > 90 ? 'error' : 'primary'}
                        />
                      </Box>

                      {/* Register Button */}
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PersonAdd />}
                        onClick={() => handleRegister(event)}
                        disabled={spotsLeft === 0}
                      >
                        {spotsLeft === 0 ? 'Event Full' : 'Register Now'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
              Past Events
            </Typography>
            <Grid container spacing={3}>
              {pastEvents.map((event) => (
                <Grid size={{ xs: 12, md: 6 }} key={event.id}>
                  <Card sx={{ opacity: 0.8 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip
                          icon={getEventIcon(event.type)}
                          label={event.type}
                          size="small"
                          variant="outlined"
                        />
                        <Chip icon={<CheckCircle />} label="Completed" color="success" size="small" />
                      </Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.date).toLocaleDateString()} • {event.registered} attendees
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Registration Dialog */}
        <Dialog
          open={registrationDialog}
          onClose={() => setRegistrationDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Event Registration
              </Typography>
              <IconButton onClick={() => setRegistrationDialog(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedEvent && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  You are registering for: <strong>{selectedEvent.title}</strong>
                </Alert>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Full Name *"
                    value={registrationData.fullName}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, fullName: e.target.value })
                    }
                  />
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={registrationData.email}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, email: e.target.value })
                    }
                  />
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={registrationData.phone}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, phone: e.target.value })
                    }
                  />
                  <TextField
                    fullWidth
                    label="Graduation Year"
                    value={registrationData.graduationYear}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, graduationYear: e.target.value })
                    }
                  />
                  {selectedEvent.fee > 0 && (
                    <Alert severity="warning">
                      Registration fee: PKR {selectedEvent.fee.toLocaleString()} (Payment details will be sent via email)
                    </Alert>
                  )}
                </Stack>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button 
              onClick={() => setRegistrationDialog(false)}
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              size="small"
              onClick={handleSubmitRegistration} 
              startIcon={<CheckCircle />}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Confirm Registration
            </Button>
          </DialogActions>
        </Dialog>

        {/* Organize Event Dialog */}
        <Dialog open={organizeDialog} onClose={handleCloseOrganizeDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Organize an Event</Typography>
              <IconButton onClick={handleCloseOrganizeDialog}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Event Title"
                  required
                  value={eventFormData.title}
                  onChange={(e) => handleEventFormChange('title', e.target.value)}
                  placeholder="e.g., Annual Alumni Reunion 2026"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventFormData.type}
                    onChange={(e) => handleEventFormChange('type', e.target.value)}
                    label="Event Type"
                  >
                    <MenuItem value="Reunion">Reunion</MenuItem>
                    <MenuItem value="Career Fair">Career Fair</MenuItem>
                    <MenuItem value="Workshop">Workshop</MenuItem>
                    <MenuItem value="Webinar">Webinar</MenuItem>
                    <MenuItem value="Sports">Sports</MenuItem>
                    <MenuItem value="Networking">Networking</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Venue"
                  required
                  value={eventFormData.venue}
                  onChange={(e) => handleEventFormChange('venue', e.target.value)}
                  placeholder="e.g., University Main Hall"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Event Date"
                  type="date"
                  required
                  value={eventFormData.date}
                  onChange={(e) => handleEventFormChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Event Time"
                  type="time"
                  required
                  value={eventFormData.time}
                  onChange={(e) => handleEventFormChange('time', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={eventFormData.capacity}
                  onChange={(e) => handleEventFormChange('capacity', e.target.value)}
                  placeholder="Maximum number of attendees"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Registration Fee (PKR)"
                  type="number"
                  value={eventFormData.fee}
                  onChange={(e) => handleEventFormChange('fee', e.target.value)}
                  placeholder="0 for free event"
                  helperText="Leave empty or enter 0 for free events"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Event Description"
                  required
                  multiline
                  rows={4}
                  value={eventFormData.description}
                  onChange={(e) => handleEventFormChange('description', e.target.value)}
                  placeholder="Describe the event, its purpose, and what attendees can expect..."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Featured Speakers"
                  value={eventFormData.speakers}
                  onChange={(e) => handleEventFormChange('speakers', e.target.value)}
                  placeholder="List speakers/presenters (separate by commas)"
                  helperText="e.g., Dr. Ahmed Khan, Ms. Sarah Ali, Prof. Hassan Raza"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  Your event will be submitted for admin review and approval before being published.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button 
              onClick={handleCloseOrganizeDialog} 
              variant="outlined"
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEvent} 
              variant="contained"
              size="small"
              disabled={!eventFormData.title || !eventFormData.date || !eventFormData.time || !eventFormData.venue}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Submit Event
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default AlumniEvents;
