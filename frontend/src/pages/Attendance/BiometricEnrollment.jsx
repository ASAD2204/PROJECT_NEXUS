import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Alert,
  Chip,
  Divider,
  TextField,
  MenuItem,
  Autocomplete,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CloudUpload,
  ArrowBack,
  VerifiedUser,
  People,
  PhotoCamera,
  CheckCircle,
  ErrorOutline,
  Fingerprint,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';     
import { useAuth } from '../../contexts/AuthContext';
import { attendanceAPI } from '../../api/attendance';
import { sisAPI } from '../../api/sis';
import PageHeader from '../../components/Common/PageHeader';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const DEFAULT_STUDENT_LABEL = 'Search by name, roll number, or pick from the list';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');     
    resolve(result.split(',')[1] || '');
  };
  reader.onerror = () => reject(new Error('Failed to read image file'));
  reader.readAsDataURL(file);
});

const BiometricEnrollment = () => {
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const isStaff = userType === 'admin' || userType === 'teacher';

  const [mode, setMode] = useState('single');       
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualStudentId, setManualStudentId] = useState('');
  const [singleImage, setSingleImage] = useState(null);
  const [singlePreview, setSinglePreview] = useState('');
  const [multiImages, setMultiImages] = useState([]);
  const [multiPreviews, setMultiPreviews] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const effectiveStudentId = manualStudentId || selectedStudent?.student_id || selectedStudent?.id || '';

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await sisAPI.getStudents();     
        const rows = res.data?.students || res.data || [];
        const options = (Array.isArray(rows) ? rows : []).map((student) => {
          const studentId = student.student_id ?? student.id ?? student.user_id;
          const displayName = student.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || `Student ${studentId}`;
          const rollNo = student.roll_no || student.rollNo || '';

          return {
            student_id: studentId,
            id: studentId,
            roll_no: rollNo,
            name: displayName,
            label: rollNo ? `${displayName} • ${rollNo}` : displayName,
          };
        });
        setStudentOptions(options);
      } catch (e) {
        console.error('Failed to load student list', e);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [isStaff]);

  useEffect(() => () => {
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview);
    }
    multiPreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [singlePreview, multiPreviews]);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const setSingleSelection = (file) => {
    setSingleImage(file);
    setSinglePreview(file ? URL.createObjectURL(file) : '');
  };

  const setMultiSelection = (files) => {
    setMultiImages(files);
    setMultiPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSingleFileChange = (event) => {       
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearMessages();
    setSingleSelection(file);
  };

  const handleMultiFileChange = (event) => {        
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    clearMessages();
    setMultiSelection(files);
  };

  const handleSubmit = async () => {
    clearMessages();

    if (isStaff && !effectiveStudentId) {
      setErrorMessage('Select a student before enrolling face data.');
      return;
    }

    if (mode === 'multi' && !isStaff) {
      setErrorMessage('Multi-photo enrollment is available for staff only.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'multi') {
        if (multiImages.length === 0) {
          throw new Error('Upload at least one photo before enrolling.');
        }

        const images = await Promise.all(multiImages.map((file) => fileToBase64(file)));
        const res = await attendanceAPI.enrollFaceMulti(effectiveStudentId, { images });
        setSuccessMessage(res.data?.message || 'Face enrolled successfully using multiple photos.');    
      } else {
        if (!singleImage) {
          throw new Error('Upload a face image before enrolling.');
        }

        const formData = new FormData();
        formData.append('image', singleImage, singleImage.name || 'face-enrollment.png');
        if (isStaff) {
          formData.append('student_id', String(effectiveStudentId));
        }

        const res = await attendanceAPI.enrollFace(formData);
        setSuccessMessage(res.data?.message || 'Face enrolled successfully.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e.response?.data?.detail || e.message || 'Face enrollment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudentLabel = selectedStudent?.label || (manualStudentId ? `Student ID ${manualStudentId}` : 'No student selected');

  return (
    <Box className="page-container">
      <PageHeader
        title="Biometric Enrollment"
        subtitle="Register face references for attendance verification"
      />

      <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
        <Grid size={{ xs: 12, lg: 8 }} component={motion.div} variants={fadeInUp}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Enrollment Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Staff can enroll one student with a single photo or use multiple photos for stronger matching.
                  </Typography>
                </Box>

                <TextField
                  select
                  label="Enrollment type"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  fullWidth
                  helperText={isStaff ? 'Switch between single-photo and multi-photo registration.' : 'Students can only use single-photo enrollment.'}     
                >
                  <MenuItem value="single">Single photo</MenuItem>
                  {isStaff && <MenuItem value="multi">Multi-photo</MenuItem>}
                </TextField>

                {isStaff ? (
                  <Stack spacing={2}>
                    <Autocomplete
                      options={studentOptions}      
                      loading={loadingStudents}     
                      value={selectedStudent}       
                      onChange={(_, value) => {     
                        setSelectedStudent(value);  
                        setManualStudentId(String(value?.student_id || value?.id || ''));
                      }}
                      getOptionLabel={(option) => option?.label || ''}
                      isOptionEqualToValue={(option, value) => String(option?.student_id) === String(value?.student_id)}
                      renderInput={(params) => (    
                        <TextField
                          {...params}
                          label="Select student"    
                          placeholder={DEFAULT_STUDENT_LABEL}
                          helperText="Choose the student whose face data you want to register."
                          InputProps={{
                            ...params.InputProps,   
                            endAdornment: (
                              <>
                                {loadingStudents ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    <TextField
                      label="Student ID fallback"   
                      type="number"
                      value={manualStudentId}
                      onChange={(e) => setManualStudentId(e.target.value)}
                      helperText="Use this if the student is not in the list."
                    />
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Your face will be linked to your student profile automatically.
                  </Alert>
                )}

                <Divider />

                {mode === 'multi' ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Upload reference photos     
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Upload at least one clear face photo. Four or more photos give the best matching quality.
                      </Typography>
                      <Button component="label" variant="contained" startIcon={<CloudUpload />}>        
                        Choose Photos
                        <input type="file" accept="image/*" multiple hidden onChange={handleMultiFileChange} />
                      </Button>
                    </Box>

                    {multiImages.length > 0 && (    
                      <Grid container spacing={2}>  
                        {multiPreviews.map((preview, index) => (
                          <Grid key={`${preview}-${index}`} size={{ xs: 6, md: 3 }}>
                            <Paper
                              elevation={0}
                              sx={{
                                position: 'relative',
                                borderRadius: 2,    
                                overflow: 'hidden', 
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Box
                                component="img"     
                                src={preview}       
                                alt={`Enrollment preview ${index + 1}`}
                                sx={{ width: '100%', height: 180, objectFit: 'cover' }}
                              />
                              <Chip
                                size="small"        
                                label={`Photo ${index + 1}`}
                                sx={{ position: 'absolute', top: 8, left: 8 }}
                              />
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Upload face image
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Use a clear, front-facing portrait with even lighting.
                      </Typography>
                      <Button component="label" variant="contained" startIcon={<PhotoCamera />}>        
                        Choose Image
                        <input type="file" accept="image/*" hidden onChange={handleSingleFileChange} /> 
                      </Button>
                    </Box>

                    {singlePreview && (
                      <Paper
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',       
                          border: '1px solid',      
                          borderColor: 'divider',   
                          maxWidth: 420,
                        }}
                      >
                        <Box component="img" src={singlePreview} alt="Face preview" sx={{ width: '100%', height: 320, objectFit: 'cover' }} />
                      </Paper>
                    )}
                  </Stack>
                )}

                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Fingerprint />}
                  >
                    {submitting ? 'Saving enrollment...' : 'Save Face Enrollment'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/admin/settings')}
                    startIcon={<ArrowBack />}       
                  >
                    Back to Settings
                  </Button>
                </Stack>

                {submitting && <LinearProgress />}  

                {successMessage && (
                  <Alert severity="success" icon={<CheckCircle />}>
                    {successMessage}
                  </Alert>
                )}

                {errorMessage && (
                  <Alert severity="error" icon={<ErrorOutline />}>
                    {errorMessage}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} component={motion.div} variants={fadeInUp}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <VerifiedUser color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Enrollment Rules
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      {isStaff
                        ? 'Staff can use the student picker or enter a student ID manually.'
                        : 'Your image is stored against your own student profile.'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Multi-photo enrollment stores several embeddings per image for better face matching.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The attendance service applies the stored embeddings immediately during verification.
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <People color="primary" />      
                    <Typography variant="h6" fontWeight="bold">
                      Selected Student
                    </Typography>
                  </Box>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    {isStaff ? selectedStudentLabel : `Current user: ${user?.name || user?.email || 'Student'}`}
                  </Typography>
                  {isStaff && effectiveStudentId && (
                    <Chip label={`Student ID: ${effectiveStudentId}`} color="primary" variant="outlined" />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BiometricEnrollment;import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Paper,
  Alert,
  Chip,
  Divider,
  TextField,
  MenuItem,
  Autocomplete,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CloudUpload,
  ArrowBack,
  VerifiedUser,
  People,
  PhotoCamera,
  CheckCircle,
  ErrorOutline,
  Fingerprint,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceAPI } from '../../api/attendance';
import { sisAPI } from '../../api/sis';
import PageHeader from '../../components/Common/PageHeader';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const DEFAULT_STUDENT_LABEL = 'Search by name, roll number, or pick from the list';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    resolve(result.split(',')[1] || '');
  };
  reader.onerror = () => reject(new Error('Failed to read image file'));
  reader.readAsDataURL(file);
});

const BiometricEnrollment = () => {
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const isStaff = userType === 'admin' || userType === 'teacher';

  const [mode, setMode] = useState('single');
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualStudentId, setManualStudentId] = useState('');
  const [singleImage, setSingleImage] = useState(null);
  const [singlePreview, setSinglePreview] = useState('');
  const [multiImages, setMultiImages] = useState([]);
  const [multiPreviews, setMultiPreviews] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const effectiveStudentId = manualStudentId || selectedStudent?.student_id || selectedStudent?.id || '';

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await sisAPI.getStudents();
        const rows = res.data?.students || res.data || [];
        const options = (Array.isArray(rows) ? rows : []).map((student) => {
          const studentId = student.student_id ?? student.id ?? student.user_id;
          const displayName = student.name || [student.first_name, student.last_name].filter(Boolean).join(' ') || `Student ${studentId}`;
          const rollNo = student.roll_no || student.rollNo || '';

          return {
            student_id: studentId,
            id: studentId,
            roll_no: rollNo,
            name: displayName,
            label: rollNo ? `${displayName} • ${rollNo}` : displayName,
          };
        });
        setStudentOptions(options);
      } catch (e) {
        console.error('Failed to load student list', e);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [isStaff]);

  useEffect(() => () => {
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview);
    }
    multiPreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [singlePreview, multiPreviews]);

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const setSingleSelection = (file) => {
    setSingleImage(file);
    setSinglePreview(file ? URL.createObjectURL(file) : '');
  };

  const setMultiSelection = (files) => {
    setMultiImages(files);
    setMultiPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSingleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearMessages();
    setSingleSelection(file);
  };

  const handleMultiFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    clearMessages();
    setMultiSelection(files);
  };

  const handleSubmit = async () => {
    clearMessages();

    if (isStaff && !effectiveStudentId) {
      setErrorMessage('Select a student before enrolling face data.');
      return;
    }

    if (mode === 'multi' && !isStaff) {
      setErrorMessage('Multi-photo enrollment is available for staff only.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'multi') {
        if (multiImages.length === 0) {
          throw new Error('Upload at least one photo before enrolling.');
        }

        const images = await Promise.all(multiImages.map((file) => fileToBase64(file)));
        const res = await attendanceAPI.enrollFaceMulti(effectiveStudentId, { images });
        setSuccessMessage(res.data?.message || 'Face enrolled successfully using multiple photos.');
      } else {
        if (!singleImage) {
          throw new Error('Upload a face image before enrolling.');
        }

        const formData = new FormData();
        formData.append('image', singleImage, singleImage.name || 'face-enrollment.png');
        if (isStaff) {
          formData.append('student_id', String(effectiveStudentId));
        }

        const res = await attendanceAPI.enrollFace(formData);
        setSuccessMessage(res.data?.message || 'Face enrolled successfully.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e.response?.data?.detail || e.message || 'Face enrollment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStudentLabel = selectedStudent?.label || (manualStudentId ? `Student ID ${manualStudentId}` : 'No student selected');

  return (
    <Box className="page-container">
      <PageHeader
        title="Biometric Enrollment"
        subtitle="Register face references for attendance verification"
      />

      <Grid container spacing={3} component={motion.div} variants={staggerContainer} initial="initial" animate="animate">
        <Grid size={{ xs: 12, lg: 8 }} component={motion.div} variants={fadeInUp}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Enrollment Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Staff can enroll one student with a single photo or use multiple photos for stronger matching.
                  </Typography>
                </Box>

                <TextField
                  select
                  label="Enrollment type"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  fullWidth
                  helperText={isStaff ? 'Switch between single-photo and multi-photo registration.' : 'Students can only use single-photo enrollment.'}
                >
                  <MenuItem value="single">Single photo</MenuItem>
                  {isStaff && <MenuItem value="multi">Multi-photo</MenuItem>}
                </TextField>

                {isStaff ? (
                  <Stack spacing={2}>
                    <Autocomplete
                      options={studentOptions}
                      loading={loadingStudents}
                      value={selectedStudent}
                      onChange={(_, value) => {
                        setSelectedStudent(value);
                        setManualStudentId(String(value?.student_id || value?.id || ''));
                      }}
                      getOptionLabel={(option) => option?.label || ''}
                      isOptionEqualToValue={(option, value) => String(option?.student_id) === String(value?.student_id)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select student"
                          placeholder={DEFAULT_STUDENT_LABEL}
                          helperText="Choose the student whose face data you want to register."
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingStudents ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />

                    <TextField
                      label="Student ID fallback"
                      type="number"
                      value={manualStudentId}
                      onChange={(e) => setManualStudentId(e.target.value)}
                      helperText="Use this if the student is not in the list."
                    />
                  </Stack>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Your face will be linked to your student profile automatically.
                  </Alert>
                )}

                <Divider />

                {mode === 'multi' ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Upload reference photos
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Upload at least one clear face photo. Four or more photos give the best matching quality.
                      </Typography>
                      <Button component="label" variant="contained" startIcon={<CloudUpload />}>
                        Choose Photos
                        <input type="file" accept="image/*" multiple hidden onChange={handleMultiFileChange} />
                      </Button>
                    </Box>

                    {multiImages.length > 0 && (
                      <Grid container spacing={2}>
                        {multiPreviews.map((preview, index) => (
                          <Grid key={`${preview}-${index}`} size={{ xs: 6, md: 3 }}>
                            <Paper
                              elevation={0}
                              sx={{
                                position: 'relative',
                                borderRadius: 2,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Box
                                component="img"
                                src={preview}
                                alt={`Enrollment preview ${index + 1}`}
                                sx={{ width: '100%', height: 180, objectFit: 'cover' }}
                              />
                              <Chip
                                size="small"
                                label={`Photo ${index + 1}`}
                                sx={{ position: 'absolute', top: 8, left: 8 }}
                              />
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Upload face image
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Use a clear, front-facing portrait with even lighting.
                      </Typography>
                      <Button component="label" variant="contained" startIcon={<PhotoCamera />}>
                        Choose Image
                        <input type="file" accept="image/*" hidden onChange={handleSingleFileChange} />
                      </Button>
                    </Box>

                    {singlePreview && (
                      <Paper
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          maxWidth: 420,
                        }}
                      >
                        <Box component="img" src={singlePreview} alt="Face preview" sx={{ width: '100%', height: 320, objectFit: 'cover' }} />
                      </Paper>
                    )}
                  </Stack>
                )}

                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Fingerprint />}
                  >
                    {submitting ? 'Saving enrollment...' : 'Save Face Enrollment'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/admin/settings')}
                    startIcon={<ArrowBack />}
                  >
                    Back to Settings
                  </Button>
                </Stack>

                {submitting && <LinearProgress />}

                {successMessage && (
                  <Alert severity="success" icon={<CheckCircle />}>
                    {successMessage}
                  </Alert>
                )}

                {errorMessage && (
                  <Alert severity="error" icon={<ErrorOutline />}>
                    {errorMessage}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} component={motion.div} variants={fadeInUp}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <VerifiedUser color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Enrollment Rules
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      {isStaff
                        ? 'Staff can use the student picker or enter a student ID manually.'
                        : 'Your image is stored against your own student profile.'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Multi-photo enrollment stores several embeddings per image for better face matching.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The attendance service applies the stored embeddings immediately during verification.
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <People color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Selected Student
                    </Typography>
                  </Box>
                  <Divider />
                  <Typography variant="body2" color="text.secondary">
                    {isStaff ? selectedStudentLabel : `Current user: ${user?.name || user?.email || 'Student'}`}
                  </Typography>
                  {isStaff && effectiveStudentId && (
                    <Chip label={`Student ID: ${effectiveStudentId}`} color="primary" variant="outlined" />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BiometricEnrollment;