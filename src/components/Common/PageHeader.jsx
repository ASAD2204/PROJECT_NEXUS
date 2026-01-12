import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const PageHeader = ({ title, subtitle, breadcrumbs, action }) => {
  return (
    <Box mb={3}>
      {breadcrumbs && (
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 1 }}>
          {breadcrumbs.map((crumb, index) => (
            crumb.path ? (
              <MuiLink
                key={index}
                component={Link}
                to={crumb.path}
                underline="hover"
                color="inherit"
              >
                {crumb.label}
              </MuiLink>
            ) : (
              <Typography key={index} color="text.primary">
                {crumb.label}
              </Typography>
            )
          ))}
        </Breadcrumbs>
      )}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
    </Box>
  );
};

export default PageHeader;
