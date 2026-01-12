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
  MenuBook,
  Inventory,
  Schedule,
  CloudDownload,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';

const Library = () => {
  return (
    <Box className="page-container">
      <PageHeader
        title="Library"
        subtitle="Browse books, journals, and digital resources"
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Books Borrowed"
            value={3}
            icon={MenuBook}
            color="primary"
            subtitle="Maximum: 5 books"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Available Slots"
            value={2}
            icon={Inventory}
            color="success"
            subtitle="Can borrow more"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Return Due"
            value="5 days"
            icon={Schedule}
            color="warning"
            subtitle="Next return: Jan 9"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="E-Books"
            value="1,250"
            icon={CloudDownload}
            color="info"
            trend={{ direction: 'up', value: '+50 this month' }}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <MenuBook sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Library System Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Browse books, reserve materials, and access digital resources.
          </Typography>
          <Chip label="Under Development" color="primary" />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Library;
