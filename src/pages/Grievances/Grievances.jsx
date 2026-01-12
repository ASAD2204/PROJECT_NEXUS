import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  SupportAgent,
  Report,
  CheckCircle,
  PendingActions,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';

const Grievances = () => {
  return (
    <Box className="page-container">
      <PageHeader
        title="Grievances"
        subtitle="Submit and track your complaints and concerns"
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Submitted"
            value={2}
            icon={Report}
            color="info"
            subtitle="All grievances"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending"
            value={1}
            icon={PendingActions}
            color="warning"
            subtitle="Under review"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Resolved"
            value={1}
            icon={CheckCircle}
            color="success"
            trend={{ direction: 'up', value: '50%' }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Avg. Resolution"
            value="3 days"
            icon={SupportAgent}
            color="primary"
            trend={{ direction: 'down', value: '-1 day' }}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <SupportAgent sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Grievance System Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Submit complaints, track status, and get timely resolutions.
          </Typography>
          <Chip label="Under Development" color="primary" />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Grievances;
