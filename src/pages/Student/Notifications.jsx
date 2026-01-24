import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  Divider,
  useTheme,
  alpha,
  Badge,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Notifications as NotificationsIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  CheckCircle,
  MarkEmailRead,
  Delete,
  Circle,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const Notifications = () => {
  const theme = useTheme();

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Assignment Due Tomorrow',
      subtitle: 'Binary Search Tree Implementation - Data Structures',
      time: '2 hours ago',
      read: false,
      icon: AssignmentIcon,
      color: 'error',
      category: 'Assignment',
    },
    {
      id: 2,
      title: 'Fee Payment Reminder',
      subtitle: 'Spring 2026 Tuition Fee due on February 1st',
      time: '5 hours ago',
      read: false,
      icon: PaymentIcon,
      color: 'warning',
      category: 'Finance',
    },
    {
      id: 3,
      title: 'New Course Material',
      subtitle: 'Dr. Sarah Ahmed posted new lecture slides for Week 5',
      time: '1 day ago',
      read: true,
      icon: SchoolIcon,
      color: 'info',
      category: 'Academic',
    },
    {
      id: 4,
      title: 'Mid-term Exam Schedule',
      subtitle: 'Data Structures exam on January 28th at 9:00 AM',
      time: '2 days ago',
      read: true,
      icon: InfoIcon,
      color: 'primary',
      category: 'Announcement',
    },
    {
      id: 5,
      title: 'Grade Posted',
      subtitle: 'Your grade for Database Assignment 3 has been posted: A-',
      time: '3 days ago',
      read: true,
      icon: CheckCircle,
      color: 'success',
      category: 'Grade',
    },
    {
      id: 6,
      title: 'Library Book Due',
      subtitle: 'Introduction to Algorithms is due for return on January 27th',
      time: '3 days ago',
      read: false,
      icon: InfoIcon,
      color: 'warning',
      category: 'Library',
    },
  ]);

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    today: notifications.filter(n => n.time.includes('hour')).length,
  };

  const handleMarkAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={NotificationsIcon}
        title="Notifications"
        subtitle="Stay updated with your latest activities"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />

      {/* STATS CARDS */}
      <Grid 
        container 
        spacing={3} 
        sx={{ mb: 4 }}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Grid size={{ xs: 12, sm: 4 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Notifications
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {stats.unread}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unread
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'error.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Badge badgeContent={stats.unread} color="warning">
                    <Circle sx={{ fontSize: 24 }} />
                  </Badge>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {stats.today}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Today
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MarkEmailRead sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ACTIONS */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          label="Mark All as Read"
          onClick={handleMarkAllAsRead}
          icon={<CheckCircle />}
          clickable
          sx={{ 
            fontWeight: 600,
            px: 2,
          }}
        />
      </Box>

      {/* NOTIFICATIONS LIST */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Stack spacing={2}>
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <motion.div key={notification.id} variants={fadeInUp}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(102,126,234,0.15)' 
                      : 'rgba(102,126,234,0.12)',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(0,0,0,0.3)'
                      : '0 4px 12px rgba(102,126,234,0.08)',
                    background: !notification.read 
                      ? alpha(theme.palette.primary.main, 0.03)
                      : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 6px 16px rgba(0,0,0,0.4)'
                        : '0 6px 16px rgba(102,126,234,0.15)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: `${notification.color}.main`,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon sx={{ fontSize: 24 }} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          {!notification.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: 'primary.main',
                              }}
                            />
                          )}
                          <Typography variant="subtitle1" fontWeight="bold">
                            {notification.title}
                          </Typography>
                          <Chip 
                            label={notification.category} 
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {notification.subtitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.time}
                        </Typography>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={1}>
                        {!notification.read && (
                          <IconButton
                            size="small"
                            onClick={() => handleMarkAsRead(notification.id)}
                            sx={{ color: 'success.main' }}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(notification.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};

export default Notifications;
