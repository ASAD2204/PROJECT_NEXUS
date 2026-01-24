import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  MenuItem,
  Stack,
  useTheme,
  alpha,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  SupportAgent,
  Report,
  CheckCircle,
  PendingActions,
  ExpandMore,
  Add,
  Warning,
  AccessTime,
  ReportProblem,
  ConfirmationNumber,
  Close,
  Autorenew,
} from '@mui/icons-material';
import PageTransition from '../../components/Common/PageTransition';
import EmptyState from '../../components/Common/EmptyState';
import FileDropzone from '../../components/Forms/FileDropzone';
import { grievances, submitGrievance } from '../../data/dummyData';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const Grievances = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'Academic',
    priority: 'Medium',
    subject: '',
    description: '',
    attachments: [],
  });

  const stats = useMemo(() => {
    const total = grievances.length;
    const pending = grievances.filter((g) => g.status === 'Pending' || g.status === 'In Progress').length;
    const resolved = grievances.filter((g) => g.status === 'Resolved' || g.status === 'Closed').length;
    return { total, pending, resolved };
  }, []);

  const handleSubmit = () => {
    if (!form.subject || !form.description) {
      showSnackbar('Please fill all required fields', 'error');
      return;
    }
    const result = submitGrievance({
      category: form.category,
      priority: form.priority,
      subject: form.subject,
      description: form.description,
      attachments: form.attachments,
      status: 'Pending',
      studentId: 'STU001',
    });
    showSnackbar(`Ticket #${result.ticketId} created successfully`, 'success');
    setOpen(false);
    setForm({ category: 'Academic', priority: 'Medium', subject: '', description: '', attachments: [] });
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
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
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
                <SupportAgent sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Grievance Portal
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Submit and track your complaints and concerns
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(240,147,251,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
                  boxShadow: '0 12px 32px rgba(240,147,251,0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Submit Grievance
            </Button>
          </Stack>
        </Box>

        {/* STAT CARDS */}
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
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Submitted
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
                    <Report sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stats.pending}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'warning.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PendingActions sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stats.resolved}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resolved
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
                    <CheckCircle sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <Card sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                      {stats.avgResolutionTime}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Resolution
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'info.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AccessTime sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* MY GRIEVANCES SECTION */}
        {grievances.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No grievances yet"
            message="Create a new grievance to get support."
            actionLabel="New Grievance"
            onAction={() => setOpen(true)}
          />
        ) : (
          <Box
            component={motion.div}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              My Grievances ({grievances.length})
            </Typography>
            <Stack spacing={3}>
              {grievances.map((g) => (
                <Accordion
                  key={g.id}
                  component={motion.div}
                  variants={fadeInUp}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 8px 24px rgba(0,0,0,0.3)'
                      : '0 8px 24px rgba(0,0,0,0.08)',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    sx={{ 
                      px: 3,
                      '& .MuiAccordionSummary-content': {
                        my: 2,
                      },
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                      {/* CATEGORY ICON */}
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          background: g.status === 'Resolved' || g.status === 'Closed' 
                            ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                            : g.status === 'Pending'
                            ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        {g.status === 'Resolved' || g.status === 'Closed' ? (
                          <CheckCircle sx={{ color: 'white', fontSize: 28 }} />
                        ) : g.status === 'Pending' ? (
                          <PendingActions sx={{ color: 'white', fontSize: 28 }} />
                        ) : (
                          <ReportProblem sx={{ color: 'white', fontSize: 28 }} />
                        )}
                      </Box>
                      
                      {/* CONTENT */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {g.subject}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                          <Chip
                            label={g.category}
                            size="small"
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                          <Chip
                            label={`Priority: ${g.priority}`}
                            size="small"
                            variant="outlined"
                            color={g.priority === 'High' ? 'error' : g.priority === 'Medium' ? 'warning' : 'default'}
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip
                            icon={<ConfirmationNumber />}
                            label={g.ticketId}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                      </Box>
                      
                      {/* STATUS CHIP */}
                      <Chip
                        label={g.status}
                        sx={{
                          fontWeight: 'bold',
                          minWidth: 100,
                          ...(g.status === 'Resolved' || g.status === 'Closed' 
                            ? {
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                color: 'white',
                              }
                            : g.status === 'Pending'
                            ? {
                                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                color: 'white',
                              }
                            : {
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white',
                              }
                          ),
                        }}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 3, pb: 3 }}>
                    {/* DESCRIPTION */}
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                        {g.description}
                      </Typography>
                    </Box>
                    
                    {/* ADMIN REPLY */}
                    {g.resolution && (
                      <Card
                        sx={{
                          mt: 2,
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: 'success.main',
                          background: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.success.main, 0.1)
                            : alpha(theme.palette.success.main, 0.05),
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CheckCircle sx={{ color: 'white', fontSize: 22 }} />
                            </Box>
                            <Typography variant="subtitle1" color="success.main" fontWeight="bold">
                              Admin Response
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                            {g.resolution}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* RE-OPEN BUTTON */}
                    {g.status === 'Resolved' && g.resolvedAt && (
                      (Date.now() - new Date(g.resolvedAt).getTime()) <= 7 * 24 * 60 * 60 * 1000 && (
                        <Button 
                          variant="outlined" 
                          startIcon={<Autorenew />}
                          size="small" 
                          sx={{ 
                            mt: 2,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                          }}
                        >
                          Re-open Ticket
                        </Button>
                      )
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>
        )}

        {/* ADD GRIEVANCE DIALOG */}
        <Dialog 
          open={open} 
          onClose={() => setOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
            },
          }}
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(240,147,251,0.3)',
                  }}
                >
                  <Warning sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  Submit New Grievance
                </Typography>
              </Stack>
              <IconButton onClick={() => setOpen(false)} edge="end">
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={3}>
              {/* CATEGORY SELECT */}
              <TextField
                select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              >
                <MenuItem value="Academic">📚 Academic</MenuItem>
                <MenuItem value="Finance">💰 Finance</MenuItem>
                <MenuItem value="Facilities">🏢 Facilities</MenuItem>
                <MenuItem value="Harassment">⚠️ Harassment</MenuItem>
                <MenuItem value="Other">📝 Other</MenuItem>
              </TextField>

              {/* PRIORITY */}
              <FormControl>
                <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Priority</FormLabel>
                <RadioGroup
                  row
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <FormControlLabel 
                    value="Low" 
                    control={<Radio />} 
                    label={<Typography variant="body2">Low</Typography>}
                  />
                  <FormControlLabel 
                    value="Medium" 
                    control={<Radio />} 
                    label={<Typography variant="body2">Medium</Typography>}
                  />
                  <FormControlLabel 
                    value="High" 
                    control={<Radio />} 
                    label={<Typography variant="body2" color="error">High</Typography>}
                  />
                </RadioGroup>
              </FormControl>

              {/* SUBJECT */}
              <TextField
                label="Subject"
                placeholder="Brief description of your issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* DESCRIPTION */}
              <TextField
                label="Description"
                placeholder="Provide detailed information about your grievance"
                multiline
                minRows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* ATTACHMENTS */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Attachments (Optional)
                </Typography>
                <FileDropzone onFileSelect={(file) => setForm({ ...form, attachments: [file.name] })} />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setOpen(false)}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit} 
              startIcon={<Warning />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                boxShadow: '0 4px 12px rgba(240,147,251,0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
                  boxShadow: '0 6px 16px rgba(240,147,251,0.5)',
                },
              }}
            >
              Submit Grievance
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageTransition>
  );
};

export default Grievances;
