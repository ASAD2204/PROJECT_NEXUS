import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  Button,
  TextField,
  Stack,
  Avatar,
  IconButton,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Mail,
  CheckCircle,
  Warning,
  ArrowUpward,
  Send,
  Person,
  School,
  AccessTime,
  ConfirmationNumber,
  PendingActions,
  Category,
} from '@mui/icons-material';
import { grievances } from '../../data/dummyData';
import PageTransition from '../../components/Common/PageTransition';
import EmptyState from '../../components/Common/EmptyState';
import StatCard from '../../components/Common/StatCard';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const GrievanceManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [selectedId, setSelectedId] = useState(grievances[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let data = [...grievances];
    if (filter === 'pending') {
      data = data.filter((g) => g.status === 'Pending' || g.status === 'In Progress');
    }
    if (filter === 'urgent') {
      data = data.filter((g) => g.priority === 'High');
    }
    return data;
  }, [filter]);

  const selected = filtered.find((g) => g.id === selectedId) || filtered[0];
  const pendingCount = grievances.filter((g) => g.status === 'Pending' || g.status === 'In Progress').length;
  const highPriorityCount = grievances.filter((g) => g.priority === 'High' && g.status !== 'Resolved').length;

  const handleResolve = () => {
    if (!selected) return;
    showSnackbar(`Marked ${selected.ticketId} as resolved`, 'success');
  };

  const handleEscalate = () => {
    if (!selected) return;
    showSnackbar(`Escalated ${selected.ticketId} to higher authority`, 'warning');
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      showSnackbar('Reply cannot be empty', 'error');
      return;
    }
    showSnackbar('Reply sent. Status updated to In Progress.', 'success');
    setReplyText('');
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <PageTransition>
      <Box className="page-container">
        {/* HEADER */}
        <Box 
          sx={{ 
            mb: 4,
            p: 4,
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(240,147,251,0.12) 0%, rgba(245,87,108,0.12) 100%)'
              : 'linear-gradient(135deg, rgba(240,147,251,0.08) 0%, rgba(245,87,108,0.08) 100%)',
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(240,147,251,0.2)' : 'rgba(240,147,251,0.15)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(240,147,251,0.4)',
              }}
            >
              <Mail sx={{ fontSize: 36, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Grievance Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Review, respond, and resolve student grievances
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* TOP STATS BAR */}
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
            <StatCard
              title="Total Pending"
              value={pendingCount}
              icon={PendingActions}
              color="warning"
              subtitle="Requires attention"
              tooltip="Total number of pending grievances that need to be reviewed"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="High Priority Open"
              value={highPriorityCount}
              icon={Warning}
              color="error"
              subtitle="Urgent cases"
              tooltip="Number of high priority grievances that are still open and need immediate action"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="Avg Resolution Time"
              value="2.4d"
              icon={AccessTime}
              color="info"
              subtitle="Average days"
              tooltip="Average time taken to resolve grievances from submission to resolution"
            />
          </Grid>
        </Grid>

        {/* MASTER-DETAIL SPLIT VIEW */}
        <Grid
          container
          spacing={3}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* LEFT PANEL - INBOX LIST (35%) */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ 
              height: 600, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(0,0,0,0.3)'
                : '0 8px 24px rgba(0,0,0,0.08)',
            }}>
              <CardContent sx={{ p: 2 }}>
                {/* FILTER CHIPS */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label="All"
                    onClick={() => setFilter('all')}
                    sx={{
                      fontWeight: 600,
                      ...(filter === 'all' && {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                      }),
                    }}
                  />
                  <Chip
                    label="Pending"
                    onClick={() => setFilter('pending')}
                    sx={{
                      fontWeight: 600,
                      ...(filter === 'pending' && {
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white',
                      }),
                    }}
                  />
                  <Chip
                    label="Urgent"
                    onClick={() => setFilter('urgent')}
                    sx={{
                      fontWeight: 600,
                      ...(filter === 'urgent' && {
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                      }),
                    }}
                  />
                </Stack>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                  {filtered.length} {filtered.length === 1 ? 'Ticket' : 'Tickets'}
                </Typography>
              </CardContent>
              
              <Divider />
              
              {/* TICKET LIST */}
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon="inbox"
                    title="No grievances found"
                    message="Try changing your filters"
                  />
                ) : (
                  <List disablePadding>
                    {filtered.map((item) => (
                      <React.Fragment key={item.id}>
                        <ListItem disablePadding>
                          <ListItemButton
                            selected={selectedId === item.id}
                            onClick={() => setSelectedId(item.id)}
                            sx={{ 
                              py: 2,
                              px: 2,
                              '&.Mui-selected': {
                                background: theme.palette.mode === 'dark'
                                  ? 'rgba(102,126,234,0.15)'
                                  : 'rgba(102,126,234,0.08)',
                                borderLeft: '4px solid',
                                borderColor: 'primary.main',
                              },
                            }}
                          >
                            <Stack spacing={1} sx={{ width: '100%' }}>
                              {/* HEADER */}
                              <Stack direction="row" alignItems="center" spacing={1}>
                                {/* CATEGORY ICON */}
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1.5,
                                    background: item.priority === 'High'
                                      ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                      : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Category sx={{ color: 'white', fontSize: 20 }} />
                                </Box>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight="bold" noWrap>
                                    {item.subject}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {item.comments?.[0]?.author || 'Student'} • {getTimeAgo(item.submittedAt)}
                                  </Typography>
                                </Box>
                              </Stack>
                              
                              {/* CHIPS */}
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                <Chip
                                  label={item.category}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                  }}
                                />
                                {item.priority === 'High' && (
                                  <Chip
                                    label="High"
                                    size="small"
                                    color="error"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                    }}
                                  />
                                )}
                                <Chip
                                  label={item.status}
                                  size="small"
                                  color={item.status === 'Resolved' ? 'success' : 'warning'}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                  }}
                                />
                              </Stack>
                            </Stack>
                          </ListItemButton>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </Card>
          </Grid>

          {/* RIGHT PANEL - DETAIL VIEW (65%) */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }} component={motion.div} variants={fadeInUp}>
            {!selected ? (
              <Card sx={{ 
                height: 600, 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <EmptyState
                  icon="inbox"
                  title="No grievance selected"
                  message="Select a grievance from the inbox to view details"
                />
              </Card>
            ) : (
              <Card sx={{ 
                height: 600, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.3)'
                  : '0 8px 24px rgba(0,0,0,0.08)',
              }}>
                {/* STUDENT PROFILE CARD */}
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Avatar 
                      sx={{ 
                        width: 56, 
                        height: 56,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      <Person sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {selected.comments?.[0]?.author || 'Student Name'}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <School sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Computer Science • {selected.ticketId}
                        </Typography>
                      </Stack>
                    </Box>
                    {selected.priority === 'High' && (
                      <Chip
                        icon={<Warning />}
                        label="High Priority"
                        color="error"
                        sx={{
                          fontWeight: 'bold',
                          '@keyframes pulse': {
                            '0%': { boxShadow: '0 0 0 0 rgba(211,47,47,0.4)' },
                            '70%': { boxShadow: '0 0 0 10px rgba(211,47,47,0)' },
                            '100%': { boxShadow: '0 0 0 0 rgba(211,47,47,0)' },
                          },
                          animation: 'pulse 2s infinite',
                        }}
                      />
                    )}
                  </Stack>

                  {/* TICKET INFO */}
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2.5, 
                      mb: 2,
                      borderRadius: 2,
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {selected.subject}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {selected.description}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                      <Chip 
                        icon={<Category />}
                        label={selected.category} 
                        size="small" 
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip 
                        icon={<ConfirmationNumber />}
                        label={selected.ticketId} 
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip 
                        icon={<AccessTime />}
                        label={new Date(selected.submittedAt).toLocaleDateString()} 
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                  </Paper>

                  {/* CONVERSATION THREAD */}
                  {selected.comments?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Conversation
                      </Typography>
                      <Stack spacing={2}>
                        {selected.comments.map((comment) => (
                          <Box key={comment.id} sx={{ display: 'flex', gap: 2 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {comment.author?.[0] || 'U'}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {comment.author} ({comment.role})
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.timestamp).toLocaleString()}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {comment.text}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>

                <Divider />

                {/* REPLY BOX AT BOTTOM */}
                <Box sx={{ p: 3, mt: 'auto' }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />

                  {/* ACTION BUTTONS */}
                  <Stack direction="row" spacing={2} justifyContent="space-between" flexWrap="wrap">
                    <Button 
                      variant="contained" 
                      startIcon={<Send />} 
                      onClick={handleReply}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 4px 12px rgba(102,126,234,0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                          boxShadow: '0 6px 16px rgba(102,126,234,0.5)',
                        },
                      }}
                    >
                      Send Reply
                    </Button>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        variant="outlined" 
                        startIcon={<ArrowUpward />} 
                        color="warning" 
                        onClick={handleEscalate}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                        }}
                      >
                        Escalate
                      </Button>
                      <Button 
                        variant="contained" 
                        startIcon={<CheckCircle />} 
                        onClick={handleResolve}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 600,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                          boxShadow: '0 4px 12px rgba(17,153,142,0.4)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #0e7d72 0%, #2ed665 100%)',
                            boxShadow: '0 6px 16px rgba(17,153,142,0.5)',
                          },
                        }}
                      >
                        Mark Resolved
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default GrievanceManagement;
