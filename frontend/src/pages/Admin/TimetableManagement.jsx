import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Stepper,
  Step,
  StepLabel,
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
  School,
  Layers,
  Settings,
  Preview,
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
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const STEPS = ['Select Batch', 'Add Constraints', 'Configuration', 'Solve & Review'];

const TimetableManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  // -- State --
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const [programs, setPrograms] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [constraints, setConstraints] = useState([]);
  const [timetableSets, setTimetableSets] = useState([]);

  // Selection state
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourses, setSelectedCourses] = useState([]);

  // Config state
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
  const [draftName, setDraftName] = useState('');

  // -- Data Loading --
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [progRes, courseRes, conRes, setRes] = await Promise.all([
        sisAPI.getPrograms(),
        lmsAPI.getCoursesAdmin(),
        schedulerAPI.getConstraints(),
        schedulerAPI.getTimetableSets(),
      ]);

      setPrograms(unwrapCollection(progRes.data, ['programs']));
      setAllCourses(unwrapCollection(courseRes.data, ['courses']));
      setConstraints(unwrapCollection(conRes.data, ['constraints']));
      setTimetableSets(Array.isArray(setRes.data) ? setRes.data : []);
    } catch (e) {
      showSnackbar('Failed to load required data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -- Helpers --
  const filteredCourses = useMemo(() => {
    if (!selectedProgram || !selectedSemester) return [];
    return allCourses.filter(c => 
      String(c.program_id) === String(selectedProgram) && 
      String(c.semester_id) === String(selectedSemester)
    );
  }, [allCourses, selectedProgram, selectedSemester]);

  // -- Handlers --
  const handleGenerate = async () => {
    if (selectedCourses.length === 0) {
      showSnackbar('Please select at least one course.', 'warning');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await schedulerAPI.generateTimetable({
        course_ids: selectedCourses,
        ...genConfig,
        save_as_draft: true,
        draft_name: draftName || `${programs.find(p => String(p.program_id) === selectedProgram)?.title} Sem ${selectedSemester}`,
        program_id: Number(selectedProgram),
        semester_id: Number(selectedSemester),
      });
      setResults(res.data);
      if (res.data.unscheduled?.length > 0 && res.data.created?.length === 0) {
        showSnackbar('Conflict solver failed to find slots.', 'error');
      } else {
        showSnackbar('Timetable generated successfully!', 'success');
        loadData();
      }
    } catch (e) {
      showSnackbar(e.response?.data?.detail || 'Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConstraint = async () => {
    try {
      await schedulerAPI.createConstraint(newConstraint);
      showSnackbar('Constraint added', 'success');
      const conRes = await schedulerAPI.getConstraints();
      setConstraints(unwrapCollection(conRes.data, ['constraints']));
    } catch (e) {
      showSnackbar('Failed to add constraint', 'error');
    }
  };

  const handleDeleteConstraint = async (id) => {
    try {
      await schedulerAPI.deleteConstraint(id);
      showSnackbar('Constraint removed', 'success');
      const conRes = await schedulerAPI.getConstraints();
      setConstraints(unwrapCollection(conRes.data, ['constraints']));
    } catch (e) {
      showSnackbar('Failed to delete constraint', 'error');
    }
  };

  const handlePublishSet = async (id) => {
    try {
      await schedulerAPI.publishTimetableSet(id);
      showSnackbar('Timetable published to live calendar', 'success');
      loadData();
    } catch (e) {
      showSnackbar('Failed to publish', 'error');
    }
  };

  const handleDeleteSet = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      await schedulerAPI.deleteTimetableSet(id);
      showSnackbar('Draft deleted', 'success');
      loadData();
    } catch (e) {
      showSnackbar('Failed to delete draft', 'error');
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  // -- Render Helpers --
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight="bold">1. Select Academic Batch</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Program</InputLabel>
                  <Select
                    value={selectedProgram}
                    label="Program"
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      setSelectedCourses([]);
                    }}
                  >
                    {programs.map(p => (
                      <MenuItem key={p.program_id} value={String(p.program_id)}>{p.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={selectedSemester}
                    label="Semester"
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setSelectedCourses([]);
                    }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <MenuItem key={s} value={String(s)}>Semester {s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {filteredCourses.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Pick Courses to Schedule</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox 
                            indeterminate={selectedCourses.length > 0 && selectedCourses.length < filteredCourses.length}
                            checked={selectedCourses.length === filteredCourses.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCourses(filteredCourses.map(c => c.course_id));
                              else setSelectedCourses([]);
                            }}
                          />
                        </TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Teacher</TableCell>
                        <TableCell>Room</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCourses.map(course => (
                        <TableRow key={course.course_id}>
                          <TableCell padding="checkbox">
                            <Checkbox 
                              checked={selectedCourses.includes(course.course_id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCourses([...selectedCourses, course.course_id]);
                                else setSelectedCourses(selectedCourses.filter(id => id !== course.course_id));
                              }}
                            />
                          </TableCell>
                          <TableCell>{course.code}</TableCell>
                          <TableCell>{course.title}</TableCell>
                          <TableCell>{course.faculty_id ? `ID: ${course.faculty_id}` : 'None'}</TableCell>
                          <TableCell>{course.room_no || 'TBD'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight="bold">2. Global Resource Constraints</Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.02) }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newConstraint.resource_type}
                      label="Type"
                      onChange={e => setNewConstraint({ ...newConstraint, resource_type: e.target.value })}
                    >
                      <MenuItem value="faculty">Faculty Busy</MenuItem>
                      <MenuItem value="room">Room Locked</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField 
                    label="Resource ID" 
                    size="small" 
                    fullWidth 
                    value={newConstraint.resource_id}
                    onChange={e => setNewConstraint({ ...newConstraint, resource_id: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Select
                    fullWidth
                    size="small"
                    value={newConstraint.day_of_week}
                    onChange={e => setNewConstraint({ ...newConstraint, day_of_week: e.target.value })}
                  >
                    {DAYS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField type="time" label="Start" size="small" fullWidth InputLabelProps={{ shrink: true }} value={newConstraint.start_time} onChange={e => setNewConstraint({...newConstraint, start_time: e.target.value})} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField type="time" label="End" size="small" fullWidth InputLabelProps={{ shrink: true }} value={newConstraint.end_time} onChange={e => setNewConstraint({...newConstraint, end_time: e.target.value})} />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <IconButton color="primary" onClick={handleAddConstraint}><Add /></IconButton>
                </Grid>
              </Grid>
            </Paper>

            <Typography variant="subtitle2">Active Constraints</Typography>
            <Grid container spacing={1}>
              {constraints.map(c => (
                <Grid item key={c.constraint_id} xs={12} sm={6} md={4}>
                  <Chip 
                    label={`${c.resource_type === 'faculty' ? '👤' : '🚪'} ${c.resource_id}: ${c.day_of_week.slice(0,3)} ${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}`}
                    onDelete={() => handleDeleteConstraint(c.constraint_id)}
                    color="error"
                    variant="outlined"
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />
                </Grid>
              ))}
            </Grid>
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight="bold">3. Solver Configuration</Typography>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Working Days</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {DAYS.map((day) => (
                    <Chip
                      key={day}
                      label={day}
                      onClick={() => {
                        const current = genConfig.days_of_week;
                        const next = current.includes(day)
                          ? current.filter(d => d !== day)
                          : [...current, day];
                        setGenConfig({ ...genConfig, days_of_week: next });
                      }}
                      color={genConfig.days_of_week.includes(day) ? "primary" : "default"}
                      variant={genConfig.days_of_week.includes(day) ? "filled" : "outlined"}
                      sx={{ m: 0.5 }}
                    />
                  ))}
                </Stack>
                {genConfig.days_of_week.length === 0 && (
                  <Typography variant="caption" color="error">Please select at least one day.</Typography>
                )}
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Working Window</Typography>
                    <Stack spacing={2}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}><TextField label="Start Hour (0-23)" type="number" fullWidth value={genConfig.start_hour} onChange={e => setGenConfig({...genConfig, start_hour: parseInt(e.target.value)})} inputProps={{ min: 0, max: 23 }} required/></Grid>
                        <Grid item xs={6}><TextField label="End Hour (0-23)" type="number" fullWidth value={genConfig.end_hour} onChange={e => setGenConfig({...genConfig, end_hour: parseInt(e.target.value)})} inputProps={{ min: 0, max: 23 }} required/></Grid>
                      </Grid>
                      <TextField label="Lecture Duration (Mins)" type="number" fullWidth value={genConfig.slot_minutes} onChange={e => setGenConfig({...genConfig, slot_minutes: parseInt(e.target.value)})} inputProps={{ min: 15, max: 180 }} required/>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Break / Lunch</Typography>
                    <Stack spacing={2}>
                      <Grid container spacing={1}>
                        <Grid item xs={6}><TextField label="Break Start" type="number" fullWidth value={genConfig.break_start_hour} onChange={e => setGenConfig({...genConfig, break_start_hour: parseInt(e.target.value)})} inputProps={{ min: 0, max: 23 }}/></Grid>
                        <Grid item xs={6}><TextField label="Break End" type="number" fullWidth value={genConfig.break_end_hour} onChange={e => setGenConfig({...genConfig, break_end_hour: parseInt(e.target.value)})} inputProps={{ min: 0, max: 23 }}/></Grid>
                      </Grid>
                      <TextField label="Max Lectures per Day" type="number" fullWidth value={genConfig.max_classes_per_day} onChange={e => setGenConfig({...genConfig, max_classes_per_day: parseInt(e.target.value)})} inputProps={{ min: 1, max: 10 }} required/>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <TextField label="Draft Name" placeholder="e.g. BSCS-FALL-2024-V1" fullWidth value={draftName} onChange={e => setDraftName(e.target.value)} inputProps={{ maxLength: 100 }}/>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            {!results && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AutoFixHigh sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6">Ready to Solve</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Click "Solve Conflicts" to trigger the OR-Tools batch algorithm.
                </Typography>
                <Button variant="contained" size="large" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Thinking...' : 'Solve Conflicts'}
                </Button>
                {loading && <LinearProgress sx={{ mt: 2, width: '100%', maxWidth: 400, mx: 'auto' }} />}
              </Box>
            )}

            {results && (
              <Box>
                {results.unscheduled?.length > 0 && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                    <Typography variant="subtitle2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorOutline fontSize="small" /> Could not schedule {results.unscheduled.length} items:
                    </Typography>
                    <Typography variant="caption" color="error.dark">
                      {results.unscheduled.join(', ')}
                    </Typography>
                  </Paper>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Room</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.created?.map((slot, i) => (
                        <TableRow key={i}>
                          <TableCell><Chip label={slot.day_of_week} size="small" /></TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</TableCell>
                          <TableCell>{slot.course_code || `ID: ${slot.course_id}`}</TableCell>
                          <TableCell>{slot.room_no || 'TBD'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader 
          title="Batch Timetable Solver" 
          subtitle="Top-down batch scheduling using AI conflict resolution"
        />

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                  {STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Box sx={{ minHeight: 400 }}>
                  {renderStepContent(activeStep)}
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button disabled={activeStep === 0} onClick={handleBack}>Back</Button>
                  {activeStep < STEPS.length - 1 ? (
                    <Button variant="contained" onClick={handleNext}>Next</Button>
                  ) : (
                    <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => setActiveStep(0)}>Finish Wizard</Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>Saved Drafts</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={1.5}>
                    {timetableSets.length === 0 && (
                      <Typography variant="body2" color="text.secondary">No drafts available.</Typography>
                    )}
                    {timetableSets.map(set => (
                      <Paper key={set.set_id} variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2">{set.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip label={set.status} size="small" color={set.status === 'Published' ? 'success' : 'default'} />
                          <Typography variant="caption" color="text.secondary">{set.created_count} slots</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Publish />} 
                            disabled={set.status === 'Published'}
                            onClick={() => handlePublishSet(set.set_id)}
                          >
                            Publish
                          </Button>
                          <IconButton size="small" color="error" onClick={() => handleDeleteSet(set.set_id)}><Delete /></IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </PageTransition>
  );
};

export default TimetableManagement;
