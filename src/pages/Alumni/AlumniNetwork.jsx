import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  LinkedIn,
  Business,
  LocationOn,
  School,
  EmojiEvents,
  FilterList,
  PersonAdd,
  Language,
  Email,
} from '@mui/icons-material';
import { alumni, connectWithAlumni } from '../../data/dummyData';
import PageHeader from '../../components/Common/PageHeader';
import PageTransition from '../../components/Common/PageTransition';
import EmptyState from '../../components/Common/EmptyState';
import { CourseCardSkeleton } from '../../components/Common/LoadingSkeleton';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const AlumniNetwork = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [filteredAlumni, setFilteredAlumni] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let filtered = [...alumni];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (alum) =>
          alum.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alum.currentCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alum.position.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by graduation year
    if (selectedYear !== 'all') {
      filtered = filtered.filter((alum) => alum.graduationYear === parseInt(selectedYear));
    }

    // Filter by major
    if (selectedMajor !== 'all') {
      filtered = filtered.filter((alum) => alum.degree.includes(selectedMajor));
    }

    setFilteredAlumni(filtered);
  }, [searchQuery, selectedYear, selectedMajor]);

  const handleConnect = (alumnus) => {
    const result = connectWithAlumni(alumnus.id);
    if (result.success) {
      showSnackbar(result.message, 'success');
      // Open LinkedIn in new tab
      if (result.linkedIn) {
        window.open(result.linkedIn, '_blank');
      }
    } else {
      showSnackbar(result.message, 'error');
    }
  };

  const graduationYears = [...new Set(alumni.map((a) => a.graduationYear))].sort((a, b) => b - a);
  const majors = ['Computer Science', 'Software Engineering', 'Information Technology'];

  if (loading) {
    return (
      <Box>
        <PageHeader title="Alumni Network" subtitle="Loading alumni..." />
        <CourseCardSkeleton count={6} />
      </Box>
    );
  }

  return (
    <PageTransition>
      <Box className="page-container">
        <PageHeader
          title="Alumni Network"
          subtitle="Connect with successful alumni from our university"
        />

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  placeholder="Search by name, company, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Graduation Year</InputLabel>
                  <Select
                    value={selectedYear}
                    label="Graduation Year"
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    <MenuItem value="all">All Years</MenuItem>
                    {graduationYears.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Major</InputLabel>
                  <Select
                    value={selectedMajor}
                    label="Major"
                    onChange={(e) => setSelectedMajor(e.target.value)}
                  >
                    <MenuItem value="all">All Majors</MenuItem>
                    {majors.map((major) => (
                      <MenuItem key={major} value={major}>
                        {major}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {alumni.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Alumni
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="secondary">
                  {new Set(alumni.map((a) => a.currentCompany)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Companies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {new Set(alumni.map((a) => a.location)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Locations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {filteredAlumni.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Showing
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alumni Grid */}
        {filteredAlumni.length === 0 ? (
          <EmptyState
            icon="search"
            title="No Alumni Found"
            message="Try adjusting your filters or search query"
          />
        ) : (
          <Grid
            container
            spacing={3}
            component={motion.div}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredAlumni.map((alumnus) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={alumnus.id} component={motion.div} variants={fadeInUp}>
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
                  <CardContent>
                    {/* Header with Avatar and Company Logo */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Avatar
                        src={alumnus.photoUrl}
                        alt={alumnus.name}
                        sx={{ width: 80, height: 80, border: 3, borderColor: 'primary.main' }}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <img
                          src={alumnus.companyLogo}
                          alt={alumnus.currentCompany}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          {alumnus.currentCompany}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Name and Position */}
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {alumnus.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {alumnus.position}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    {/* Details */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School fontSize="small" color="action" />
                        <Typography variant="caption">
                          {alumnus.degree} • Class of {alumnus.graduationYear}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="caption">{alumnus.location}</Typography>
                      </Box>
                    </Stack>

                    {/* Expertise Tags */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                      {alumnus.expertise.slice(0, 3).map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>

                    {/* Achievements */}
                    {alumnus.achievements.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <EmojiEvents fontSize="small" color="warning" />
                          <Typography variant="caption" fontWeight="bold">
                            Achievements
                          </Typography>
                        </Box>
                        {alumnus.achievements.slice(0, 2).map((achievement, index) => (
                          <Typography
                            key={index}
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ pl: 2.5 }}
                          >
                            • {achievement}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<LinkedIn />}
                        onClick={() => handleConnect(alumnus)}
                      >
                        Connect
                      </Button>
                      <Tooltip title="Send Email">
                        <IconButton
                          color="primary"
                          onClick={() => (window.location.href = `mailto:${alumnus.email}`)}
                        >
                          <Email />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </PageTransition>
  );
};

export default AlumniNetwork;
