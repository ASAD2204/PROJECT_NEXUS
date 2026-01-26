import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { Link } from 'react-router-dom';

/**
 * PageHeader
 *
 * Small, reusable header used by most page views. Renders an optional
 * breadcrumb trail, the primary title, an optional subtitle and a right-aligned
 * `action` slot for buttons/menus. Designed to be purely presentational.
 *
 * Props:
 * - `title` (string): main heading text
 * - `subtitle` (string): optional secondary description under the title
 * - `breadcrumbs` (array): optional array [{ label, path? }] to render a trail
 * - `action` (ReactNode): optional right-side action node (buttons, menus)
 */
const PageHeader = ({ title, subtitle, breadcrumbs, action }) => {
  return (
    <Box mb={3}>
      {/* Breadcrumbs: show when provided; each crumb may include a path */}
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

      {/* Title + optional action container */}
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
        {/* Action slot (e.g., buttons) */}
        {action && <Box>{action}</Box>}
      </Box>
    </Box>
  );
};

export default PageHeader;
