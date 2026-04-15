import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  SupportAgent,
  ExpandMore,
  School,
  AttachMoney,
  Build,
  Warning,
  Computer,
  Report,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Send,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { studentAPI } from '../../api/student';

const MyTickets = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Tickets data from API
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await studentAPI.getTickets();
        setTickets(res.data?.grievances || res.data || []);
      } catch (e) { console.error(e); }
    };
    fetchTickets();
  }, []);

  const stats = {
    total: tickets.length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    rejected: tickets.filter(t => t.status === 'Rejected').length,
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Academic': return <School />;
      case 'Finance': return <AttachMoney />;
      case 'Facilities': return <Build />;
      case 'Harassment': return <Warning />;
      case 'IT Support': return <Computer />;
      default: return <Report />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Submitted': return <HourglassEmpty />;
      case 'In Progress': return <HourglassEmpty />;
      case 'Resolved': return <CheckCircle />;
      case 'Rejected': return <Cancel />;
      default: return <Report />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'default';
      case 'In Progress': return 'info';
      case 'Resolved': return 'success';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleReply = (ticketId) => {
    const comment = replyText.trim();
    if (!comment) {
      return;
    }

    studentAPI.addTicketReply(ticketId, comment)
      .then((res) => {
        setTickets((prev) => prev.map((ticket) => (
          ticket.id === ticketId
            ? {
                ...ticket,
                conversation: [
                  ...(ticket.conversation || []),
                  {
                    from: 'You',
                    message: res.data?.comment || comment,
                    timestamp: 'Just now',
                  },
                ],
              }
            : ticket
        )));
        setReplyText('');
      })
      .catch((error) => console.error(error));
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={SupportAgent}
        title="My Support Tickets"
        subtitle="Track and manage your grievances and support requests"
        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Total Tickets"
            value={stats.total}
            icon={Report}
            color="primary"
            tooltip="Total number of support tickets you have submitted."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={HourglassEmpty}
            color="info"
            tooltip="Tickets currently being reviewed or worked on by support team."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={CheckCircle}
            color="success"
            tooltip="Tickets that have been successfully resolved."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={Cancel}
            color="error"
            tooltip="Tickets that were rejected or closed without resolution."
          />
        </Grid>
      </Grid>

      {/* TICKETS LIST */}

      {/* TICKETS LIST */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Your Tickets
        </Typography>

        <Stack spacing={2}>
          {tickets.map((ticket) => (
            <motion.div key={ticket.id} variants={fadeInUp}>
              <Accordion
                expanded={expanded === ticket.id}
                onChange={handleChange(ticket.id)}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(102,126,234,0.15)' 
                    : 'rgba(102,126,234,0.12)',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(102,126,234,0.08)',
                  '&:before': { display: 'none' },
                  mb: 2,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    px: 3, 
                    py: 2,
                    '&:hover': {
                      background: alpha(theme.palette.primary.main, 0.03),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', mr: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getCategoryIcon(ticket.category)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {ticket.subject}
                        </Typography>
                        <Chip 
                          label={ticket.id} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {ticket.date}
                        </Typography>
                        <Chip 
                          label={ticket.category} 
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        <Chip
                          icon={getStatusIcon(ticket.status)}
                          label={ticket.status}
                          color={getStatusColor(ticket.status)}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, py: 3, pt: 0 }}>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* Original Issue */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Issue Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ticket.description}
                    </Typography>
                  </Box>

                  {/* Conversation History */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Conversation History
                    </Typography>
                    <Stack spacing={2}>
                      {ticket.conversation.map((msg, idx) => (
                        <Card
                          key={idx}
                          sx={{
                            p: 2,
                            background: msg.from === 'You' 
                              ? alpha(theme.palette.primary.main, 0.05)
                              : alpha(theme.palette.success.main, 0.05),
                            border: '1px solid',
                            borderColor: msg.from === 'You'
                              ? alpha(theme.palette.primary.main, 0.2)
                              : alpha(theme.palette.success.main, 0.2),
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={msg.from === 'You' ? 'primary' : 'success.main'}>
                              {msg.from}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {msg.timestamp}
                            </Typography>
                          </Stack>
                          <Typography variant="body2">
                            {msg.message}
                          </Typography>
                        </Card>
                      ))}
                    </Stack>
                  </Box>

                  {/* Reply Section (only for In Progress tickets) */}
                  {ticket.status === 'In Progress' && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Add Reply
                      </Typography>
                      <Stack direction="row" spacing={2}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          sx={{ 
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                        <Button
                          variant="contained"
                          endIcon={<Send />}
                          onClick={() => handleReply(ticket.id)}
                          sx={{
                            minWidth: 120,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5568d3 0%, #654391 100%)',
                            },
                          }}
                        >
                          Send
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default MyTickets;
