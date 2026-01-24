import React from 'react';
import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';
import Grid from '@mui/material/Grid';

// Card Skeleton - for single card loading
export const CardSkeleton = ({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton
              variant="rectangular"
              height={200}
              animation="pulse"
              sx={{ borderRadius: 2 }}
            />
          </CardContent>
        </Card>
      ))}
    </>
  );
};

// Table Skeleton - for table loading
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  const columnWidths = ['20%', '30%', '25%', '25%'];
  
  return (
    <Card>
      <CardContent>
        {/* Table Header */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          {[...Array(columns)].map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              variant="rectangular"
              width={columnWidths[index] || '25%'}
              height={40}
              animation="pulse"
            />
          ))}
        </Stack>
        
        {/* Table Rows */}
        {[...Array(rows)].map((_, rowIndex) => (
          <Stack key={rowIndex} direction="row" spacing={2} sx={{ mb: 1.5 }}>
            {[...Array(columns)].map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="rectangular"
                width={columnWidths[colIndex] || '25%'}
                height={50}
                animation="pulse"
              />
            ))}
          </Stack>
        ))}
      </CardContent>
    </Card>
  );
};

// Text Skeleton - for text content loading
export const TextSkeleton = ({ lines = 3 }) => {
  const widths = ['100%', '90%', '95%', '85%', '92%'];
  
  return (
    <Box>
      {[...Array(lines)].map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={widths[index] || '90%'}
          height={30}
          animation="pulse"
          sx={{ mb: 1 }}
        />
      ))}
    </Box>
  );
};

// Dashboard Skeleton - for dashboard page loading
export const DashboardSkeleton = () => {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={300} height={40} animation="pulse" />
        <Skeleton variant="text" width={400} height={25} animation="pulse" />
      </Box>

      {/* Stat Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[...Array(4)].map((_, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Skeleton
                  variant="rectangular"
                  height={120}
                  animation="pulse"
                  sx={{ borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={200} height={30} animation="pulse" sx={{ mb: 2 }} />
          <Skeleton
            variant="rectangular"
            height={400}
            animation="pulse"
            sx={{ borderRadius: 2 }}
          />
        </CardContent>
      </Card>

      {/* Cards Grid */}
      <Grid container spacing={3}>
        {[...Array(3)].map((_, index) => (
          <Grid key={index} size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Skeleton
                  variant="rectangular"
                  height={250}
                  animation="pulse"
                  sx={{ borderRadius: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Course Card Skeleton - for grid cards
export const CourseCardSkeleton = ({ count = 3 }) => {
  return (
    <Grid container spacing={3}>
      {[...Array(count)].map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <Skeleton variant="rectangular" width="100%" height={180} animation="pulse" />
            <CardContent>
              <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1 }} />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="text" width="50%" height={20} />
              </Stack>
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1, mb: 1 }} />
              <Skeleton variant="text" width="30%" height={20} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Profile Skeleton - for profile page loading
export const ProfileSkeleton = () => {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={250} height={40} animation="pulse" />
        <Skeleton variant="text" width={350} height={25} animation="pulse" />
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ p: 2 }}>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" width={120} height={40} animation="pulse" />
          ))}
        </Stack>
      </Card>

      {/* Profile Content */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="circular" width={120} height={120} animation="pulse" sx={{ mb: 2 }} />
                <Skeleton variant="text" width={150} height={30} animation="pulse" />
                <Skeleton variant="text" width={120} height={25} animation="pulse" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                {[...Array(6)].map((_, index) => (
                  <Skeleton key={index} variant="rectangular" height={56} animation="pulse" />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// List Skeleton - for list items loading
export const ListSkeleton = ({ items = 5 }) => {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {[...Array(items)].map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={40} height={40} animation="pulse" />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="80%" height={25} animation="pulse" />
                <Skeleton variant="text" width="60%" height={20} animation="pulse" />
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Grid Skeleton - for grid layouts
export const GridSkeleton = ({ items = 6, columns = { xs: 12, sm: 6, md: 4 } }) => {
  return (
    <Grid container spacing={3}>
      {[...Array(items)].map((_, index) => (
        <Grid key={index} size={columns}>
          <Card>
            <CardContent>
              <Skeleton
                variant="rectangular"
                height={250}
                animation="pulse"
                sx={{ borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Chat Skeleton - for chat interface loading
export const ChatSkeleton = () => {
  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
      {/* Left Panel */}
      <Box sx={{ width: '30%', maxWidth: 350 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Skeleton variant="rectangular" height={60} animation="pulse" sx={{ mb: 2, borderRadius: 2 }} />
            <Stack spacing={1}>
              {[...Array(8)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={70} animation="pulse" sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
      
      {/* Main Chat Area */}
      <Box sx={{ flex: 1 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Skeleton variant="rectangular" height={60} animation="pulse" sx={{ mb: 2, borderRadius: 2 }} />
            <Stack spacing={2} sx={{ mb: 2 }}>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: index % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                  <Skeleton
                    variant="rectangular"
                    width="60%"
                    height={80}
                    animation="pulse"
                    sx={{ borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Stack>
            <Skeleton variant="rectangular" height={60} animation="pulse" sx={{ borderRadius: 2 }} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

// Form Skeleton - for form loading
export const FormSkeleton = ({ fields = 5 }) => {
  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {[...Array(fields)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={56} animation="pulse" sx={{ borderRadius: 1 }} />
          ))}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Skeleton variant="rectangular" width={100} height={40} animation="pulse" />
            <Skeleton variant="rectangular" width={100} height={40} animation="pulse" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Default export with all variants
const LoadingSkeleton = {
  Card: CardSkeleton,
  Table: TableSkeleton,
  Text: TextSkeleton,
  Dashboard: DashboardSkeleton,
  Profile: ProfileSkeleton,
  List: ListSkeleton,
  Grid: GridSkeleton,
  Chat: ChatSkeleton,
  Form: FormSkeleton,
};

export default LoadingSkeleton;
