import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  alpha,
} from '@mui/material';
import { 
  Schedule, 
  AutoFixHigh, 
  Block, 
  Add, 
  Delete, 
  Save,
  CheckCircle,
  ErrorOutline,
  CalendarMonth,
  FileDownload,
  Publish,
  Visibility,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { schedulerAPI } from '../../api/scheduler';
import { sisAPI } from '../../api/sis';
import { lmsAPI } from '../../api/lms';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const unwrapCollection = (payload, keys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const toNumericIdList = (values) => Array.from(
  new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => Number(value))
      .filter(Number.isFinite)
  )
);

const TimetableManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filterProg, setFilterProg] = useState('');
  const [filterSem, setFilterSem] = useState('1');
  const [genConfig, setGenConfig] = useState({
    days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    slot_minutes: 60,
    start_hour: 8,
    end_hour: 17,
    break_start_hour: 13,
    break_end_hour: 14,
    max_classes_per_day: 4,
  });

  const [newConstraint, setNewConstraint] = useState({
    resource_type: 'faculty',
    resource_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
  });

  const [results, setResults] = useState(null);
  const [timetableSets, setTimetableSets] = useState([]);
  const [draftName, setDraftName] = useState('');
  const [activeStep, setActiveStep] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [secRes, conRes, progRes] = await Promise.allSettled([
        lmsAPI.getAllSections(),
        schedulerAPI.getConstraints(),
        sisAPI.getPrograms(),
      ]);
      const setsRes = await schedulerAPI.getTimetableSets().catch(() => ({ data: [] }));

      const sectionRows = secRes.status === 'fulfilled'
        ? unwrapCollection(secRes.value.data, ['sections'])
        : [];
      const constraintRows = conRes.status === 'fulfilled'
        ? unwrapCollection(conRes.value.data, ['constraints'])
        : [];
      const programRows = progRes.status === 'fulfilled'
        ? unwrapCollection(progRes.value.data, ['programs'])
        : [];

      setSections(sectionRows);
      setConstraints(constraintRows);
      setPrograms(programRows);
      setTimetableSets(Array.isArray(setsRes.data) ? setsRes.data : []);

      const failureCount = [secRes, conRes, progRes].filter((result) => result.status === 'rejected').length;
      if (failureCount > 0) {
        showSnackbar(
          failureCount === 3 ? 'Failed to load timetable data' : 'Loaded timetable data with partial failures',
          failureCount === 3 ? 'error' : 'warning'
        );
      }
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to load data', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      showSnackbar('Select at least one section from the list before generating a timetable.', 'warning');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const sectionIds = toNumericIdList(selectedSections);
      const res = await schedulerAPI.generateTimetable({
        section_ids: sectionIds,
        ...genConfig,
        save_as_draft: true,
        draft_name: draftName || undefined,
        program_id: filterProg ? Number(filterProg) : null,
        semester_id: filterSem ? Number(filterSem) : null,
      });
      setResults(res.data);
      setActiveStep(4);
      if (res.data.unscheduled?.length > 0 && res.data.created?.length === 0) {
        showSnackbar('Could not generate a valid schedule. Check constraints.', 'error');
      } else {
        showSnackbar(
          res.data.timetable_set_id
            ? `Generated ${res.data.created?.length} slots and saved draft #${res.data.timetable_set_id}`
            : `Generated ${res.data.created?.length} slots successfully!`,
          'success'
        );
        loadData();
      }
    } catch (e) {
      console.error(e);
      showSnackbar(e.response?.data?.detail || 'Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConstraint = async () => {
    try {
      await schedulerAPI.createConstraint(newConstraint);
      showSnackbar('Constraint added', 'success');
      loadData();
    } catch (e) {
      showSnackbar('Failed to add constraint', 'error');
    }
  };

  const handlePreviewSet = async (setId) => {
    try {
      const res = await schedulerAPI.getTimetableSet(setId);
      setResults({ created: res.data.created || [], unscheduled: [], timetable_set_id: setId });
      setActiveStep(4);
    } catch (e) {
      showSnackbar('Failed to load timetable set', 'error');
    }
  };

  const handlePublishSet = async (setId) => {
    try {
      await schedulerAPI.publishTimetableSet(setId);
      showSnackbar('Timetable set published successfully', 'success');
      loadData();
    } catch (e) {
      showSnackbar(e?.response?.data?.detail || 'Failed to publish timetable set', 'error');
    }
  };

  const handleExportSet = async (setId) => {
    try {
      const res = await schedulerAPI.exportTimetableSet(setId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timetable_set_${setId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      showSnackbar('Failed to export timetable set', 'error');
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!window.confirm('Delete this timetable draft?')) return;
    try {
      await schedulerAPI.deleteTimetableSet(setId);
      showSnackbar('Timetable set deleted', 'success');
      loadData();
    } catch (e) {
      showSnackbar('Failed to delete timetable set', 'error');
    }
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader 
          title="Timetable Manager" 
          subtitle="AI-driven conflict-free scheduling for courses, rooms, and faculty"
        />
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Chip label={`1. Select Batch`} color={activeStep >= 1 ? 'primary' : 'default'} />
          <Chip label={`2. Add Constraints`} color={activeStep >= 2 ? 'primary' : 'default'} />
          <Chip label={`3. Generate`} color={activeStep >= 3 ? 'primary' : 'default'} />
          <Chip label={`4. Review & Save`} color={activeStep >= 4 ? 'primary' : 'default'} />
          <Chip label={`5. Publish & Export`} color={activeStep >= 5 ? 'primary' : 'default'} />
        </Stack>

        <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
          {/* Configuration Panel */}
          <Grid size={{ xs: 12, lg: 4 }} component={motion.div} variants={fadeInUp}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule color="primary" /> Scheduler Config
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Stack spacing={2.5}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>Quick Select by Program</Typography>
                      <Grid container spacing={1}>
                        <Grid size={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Program</InputLabel>
                            <Select
                              value={filterProg}
                              label="Program"
                              onChange={(e) => setFilterProg(String(e.target.value))}
                            >
                              {programs.map((p) => (
                                <MenuItem key={p.program_id} value={String(p.program_id)}>
                                  {p.title || p.name || `Program ${p.program_id}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Semester"
                            size="small"
                            type="number"
                            fullWidth
                            value={filterSem}
                            onChange={(e) => setFilterSem(e.target.value)}
                          />
                        </Grid>
                      </Grid>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        fullWidth 
                        sx={{ mt: 1 }}
                        onClick={() => {
                          const targetProgramId = String(filterProg);
                          const targetSemesterId = String(filterSem);
                          const sids = sections
                            .filter((s) => String(s.course?.program_id ?? '') === targetProgramId && String(s.semester_id ?? '') === targetSemesterId)
                            .map((s) => s.section_id);
                          setSelectedSections(toNumericIdList([...selectedSections, ...sids]));
                        }}
                      >
                        Select All Program Sections
                      </Button>
                    </Box>

                    <FormControl fullWidth>
                      <InputLabel>Sections to Schedule</InputLabel>
                      <Select
                        multiple
                        value={selectedSections}
                        onChange={(e) => setSelectedSections(toNumericIdList(e.target.value))}
                        input={<OutlinedInput label="Sections to Schedule" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={`Sec ${value}`} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {sections.map((sec) => (
                          <MenuItem key={sec.section_id} value={sec.section_id}>
                            <Checkbox checked={selectedSections.includes(Number(sec.section_id))} />
                            <ListItemText
                              primary={`${sec.course?.code || sec.course?.title || 'Course'} - Section ${sec.section_id}`}
                              secondary={`Prog ID: ${sec.course?.program_id || 'N/A'}, Sem: ${sec.semester_id || 'N/A'}`}
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Working Days</InputLabel>
                      <Select
                        multiple
                        value={genConfig.days_of_week}
                        onChange={(e) => setGenConfig({ ...genConfig, days_of_week: e.target.value })}
                        input={<OutlinedInput label="Working Days" />}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {DAYS.map((day) => (
                          <MenuItem key={day} value={day}>
                            <Checkbox checked={genConfig.days_of_week.indexOf(day) > -1} />
                            <ListItemText primary={day} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <TextField
                          label="Start Hour"
                          type="number"
                          fullWidth
                          value={genConfig.start_hour}
                          onChange={(e) => setGenConfig({ ...genConfig, start_hour: parseInt(e.target.value) })}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="End Hour"
                          type="number"
                          fullWidth
                          value={genConfig.end_hour}
                          onChange={(e) => setGenConfig({ ...genConfig, end_hour: parseInt(e.target.value) })}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label="Slot Duration (Minutes)"
                      type="number"
                      fullWidth
                      value={genConfig.slot_minutes}
                      onChange={(e) => setGenConfig({ ...genConfig, slot_minutes: parseInt(e.target.value) })}
                    />

                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <TextField
                          label="Lunch Start (Hr)"
                          type="number"
                          fullWidth
                          value={genConfig.break_start_hour}
                          onChange={(e) => setGenConfig({ ...genConfig, break_start_hour: parseInt(e.target.value) })}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Lunch End (Hr)"
                          type="number"
                          fullWidth
                          value={genConfig.break_end_hour}
                          onChange={(e) => setGenConfig({ ...genConfig, break_end_hour: parseInt(e.target.value) })}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label="Max Classes/Day/Batch"
                      type="number"
                      fullWidth
                      value={genConfig.max_classes_per_day}
                      onChange={(e) => setGenConfig({ ...genConfig, max_classes_per_day: parseInt(e.target.value) })}
                    />

                    <TextField
                      label="Draft Name (optional)"
                      fullWidth
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="BSIT Sem 1 - Spring Draft"
                    />

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<AutoFixHigh />}
                      onClick={handleGenerate}
                      disabled={loading}
                      sx={{ py: 1.5 }}
                    >
                      {loading ? 'Solving Conflicts...' : 'Generate Timetable'}
                    </Button>
                    {loading && <LinearProgress sx={{ borderRadius: 1 }} />}
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Block color="error" /> Constraints
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={newConstraint.resource_type}
                        onChange={(e) => setNewConstraint({ ...newConstraint, resource_type: e.target.value })}
                        label="Type"
                      >
                        <MenuItem value="faculty">Faculty Unavailable</MenuItem>
                        <MenuItem value="room">Room Blocked</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="ID (Faculty/Room)"
                      size="small"
                      fullWidth
                      value={newConstraint.resource_id}
                      onChange={(e) => setNewConstraint({ ...newConstraint, resource_id: e.target.value })}
                    />

                    <Grid container spacing={1}>
                      <Grid size={6}>
                        <TextField
                          label="Start"
                          type="time"
                          size="small"
                          fullWidth
                          value={newConstraint.start_time}
                          onChange={(e) => setNewConstraint({ ...newConstraint, start_time: e.target.value })}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="End"
                          type="time"
                          size="small"
                          fullWidth
                          value={newConstraint.end_time}
                          onChange={(e) => setNewConstraint({ ...newConstraint, end_time: e.target.value })}
                        />
                      </Grid>
                    </Grid>

                    <Button variant="outlined" startIcon={<Add />} onClick={handleAddConstraint}>
                      Add Constraint
                    </Button>
                  </Stack>

                  {constraints.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Active Constraints</Typography>
                      <Stack spacing={1}>
                        {constraints.map((c) => (
                          <Paper key={c.constraint_id} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                            <Box>
                              <Typography variant="caption" fontWeight="bold" display="block">
                                {c.resource_type.toUpperCase()}: {c.resource_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {c.day_of_week} | {c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)}
                              </Typography>
                            </Box>
                            <IconButton size="small" color="error" onClick={async () => {
                              try {
                                await schedulerAPI.deleteConstraint(c.constraint_id);
                                showSnackbar('Constraint removed', 'success');
                                loadData();
                              } catch (e) {
                                showSnackbar('Failed to delete', 'error');
                              }
                            }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Saved Timetable Sets
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.5}>
                    {timetableSets.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No saved drafts yet.
                      </Typography>
                    )}
                    {timetableSets.map((set) => (
                      <Paper key={set.set_id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{set.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {set.status} • {set.created_count} slots
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" color="primary" onClick={() => handlePreviewSet(set.set_id)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="success" onClick={() => { handlePublishSet(set.set_id); setActiveStep(5); }}>
                              <Publish fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="info" onClick={() => handleExportSet(set.set_id)}>
                              <FileDownload fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSet(set.set_id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Results Panel */}
          <Grid size={{ xs: 12, lg: 8 }} component={motion.div} variants={fadeInUp}>
            {results ? (
              <Stack spacing={3}>
                {results.unscheduled?.length > 0 && (
                  <Card sx={{ border: '1px solid', borderColor: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                    <CardContent>
                      <Typography variant="subtitle1" color="error" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorOutline /> Issues Found
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {results.unscheduled.map((err, i) => (
                          <Typography key={i} variant="body2" color="error.dark">• {err}</Typography>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonth color="success" /> Generated Results
                    </Typography>
                    <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileDownload />}
                        onClick={() => {
                          if (results?.timetable_set_id) {
                            handleExportSet(results.timetable_set_id);
                            return;
                          }
                          window.print();
                        }}
                      >
                        Print / Export
                      </Button>
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                      <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableRow>
                            <TableCell>Day</TableCell>
                            <TableCell>Time Slot</TableCell>
                            <TableCell>Section</TableCell>
                            <TableCell>Room</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {results.created?.map((slot, i) => (
                            <TableRow key={i} hover>
                              <TableCell><Chip label={slot.day_of_week} size="small" variant="outlined" /></TableCell>
                              <TableCell fontWeight="bold">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</TableCell>
                              <TableCell>Section {slot.section_id}</TableCell>
                              <TableCell>{slot.room_no || 'TBD'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Box 
                sx={{ 
                  height: '100%', 
                  minHeight: 400,
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  borderRadius: 4,
                  border: '2px dashed',
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                  p: 4,
                  textAlign: 'center'
                }}
              >
                <Schedule sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.2), mb: 2 }} />
                <Typography variant="h5" color="text.secondary" fontWeight="bold">Ready to Solve</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mt: 1 }}>
                  Select sections and configure your working hours, then click Generate to let the AI find conflict-free slots.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default TimetableManagement;
