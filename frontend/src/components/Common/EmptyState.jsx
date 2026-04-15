import { Box, Typography, Button, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  LibraryBooks as LibraryIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Inbox as InboxIcon,
  Event as EventIcon,
} from '@mui/icons-material';

/**
 * Empty State Component
 * Displays when there are no items to show in a list/table
 * Provides visual feedback with icons, messages, and optional actions
 */

const iconMap = {
  assignments: AssignmentIcon,
  courses: SchoolIcon,
  books: LibraryIcon,
  messages: MessageIcon,
  notifications: NotificationsIcon,
  search: SearchIcon,
  inbox: InboxIcon,
  events: EventIcon,
};

const EmptyState = ({
  icon = 'inbox',
  title = 'No items found',
  message = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  sx = {},
}) => {
  const IconComponent = iconMap[icon] || InboxIcon;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        backgroundColor: 'transparent',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(25, 118, 210, 0.08)'
              : 'rgba(33, 150, 243, 0.12)',
          mb: 3,
        }}
      >
        <IconComponent
          sx={{
            fontSize: 64,
            color: 'primary.main',
            opacity: 0.6,
          }}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{
          mb: 1,
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mb: 3,
          color: 'text.secondary',
          maxWidth: 400,
          mx: 'auto',
        }}
      >
        {message}
      </Typography>

      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.oneOf([
    'assignments',
    'courses',
    'books',
    'messages',
    'notifications',
    'search',
    'inbox',
    'events',
  ]),
  title: PropTypes.string,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  sx: PropTypes.object,
};

export default EmptyState;
