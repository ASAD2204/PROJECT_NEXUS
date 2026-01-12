import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
  Search as SearchIcon,
  NavigateNext,
  Home as HomeIcon,
  Circle,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  School as SchoolIcon,
  Info as InfoIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { currentUser, courses, assignments, announcements } from '../../data/dummyData';

const TopBar = ({ onMenuClick, drawerWidth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  
  // State management
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [anchorElSearch, setAnchorElSearch] = useState(null);

  // Notifications data (mock)
  const notifications = [
    {
      id: 1,
      title: 'Assignment Due Tomorrow',
      subtitle: 'Binary Search Tree Implementation',
      time: '2 hours ago',
      read: false,
      icon: AssignmentIcon,
      color: 'error',
    },
    {
      id: 2,
      title: 'Fee Payment Reminder',
      subtitle: 'Fall 2025 Tuition Fee due on Jan 15',
      time: '5 hours ago',
      read: false,
      icon: PaymentIcon,
      color: 'warning',
    },
    {
      id: 3,
      title: 'New Course Material',
      subtitle: 'Dr. Sarah Ahmed posted new content',
      time: '1 day ago',
      read: true,
      icon: SchoolIcon,
      color: 'info',
    },
    {
      id: 4,
      title: 'Mid-term Exam Schedule',
      subtitle: 'Data Structures exam on January 15th',
      time: '2 days ago',
      read: true,
      icon: InfoIcon,
      color: 'primary',
    },
    {
      id: 5,
      title: 'Assignment Graded',
      subtitle: 'Sorting Algorithms - 14/15 marks',
      time: '3 days ago',
      read: true,
      icon: AssignmentIcon,
      color: 'success',
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate breadcrumbs based on current route
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs = [
      { label: 'Home', path: '/dashboard', icon: <HomeIcon sx={{ fontSize: 16, mr: 0.5 }} /> }
    ];

    const routeNames = {
      dashboard: 'Dashboard',
      profile: 'Profile',
      transcript: 'Transcript',
      attendance: 'Attendance',
      history: 'History',
      lms: 'My Courses',
      course: 'Course Details',
      assignment: 'Assignment',
      assignments: 'Assignments',
      finance: 'Fee Management',
      chat: 'Nexus Chat',
      library: 'Library',
      grievances: 'Grievances',
    };

    pathnames.forEach((value, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = routeNames[value] || value.toUpperCase();
      breadcrumbs.push({ label, path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Search functionality
  useEffect(() => {
    if (searchValue.trim() === '') {
      setSearchResults([]);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const results = [];

    // Search courses
    courses.forEach(course => {
      if (course.title.toLowerCase().includes(searchLower) || 
          course.code.toLowerCase().includes(searchLower)) {
        results.push({
          type: 'course',
          id: course.id,
          title: course.title,
          subtitle: course.code,
          path: `/lms/course/${course.id}`,
        });
      }
    });

    // Search assignments
    assignments.forEach(assignment => {
      if (assignment.title.toLowerCase().includes(searchLower)) {
        const course = courses.find(c => c.id === assignment.courseId);
        results.push({
          type: 'assignment',
          id: assignment.id,
          title: assignment.title,
          subtitle: course?.code || 'Assignment',
          path: `/lms/assignment/${assignment.id}`,
        });
      }
    });

    setSearchResults(results.slice(0, 8)); // Limit to 8 results
  }, [searchValue]);

  // Event handlers
  const handleUserMenuOpen = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleNotificationsOpen = (event) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setAnchorElNotifications(null);
  };

  const handleSearchFocus = (event) => {
    setSearchFocused(true);
    setAnchorElSearch(event.currentTarget);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on search results
    setTimeout(() => {
      setSearchFocused(false);
      setAnchorElSearch(null);
    }, 200);
  };

  const handleSearchResultClick = (path) => {
    navigate(path);
    setSearchValue('');
    setSearchResults([]);
    setSearchFocused(false);
    setAnchorElSearch(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleUserMenuClose();
  };

  const handleSettings = () => {
    navigate('/profile'); // Can create a settings page later
    handleUserMenuClose();
  };

  const handleHelp = () => {
    // Can navigate to help page or open documentation
    handleUserMenuClose();
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: 'white',
        color: 'text.primary',
      }}
      elevation={1}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3 } }}>
        {/* Left: Hamburger Menu + Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: 'text.secondary',
            }}
          >
            <MenuIcon />
          </IconButton>

          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ 
              display: { xs: 'none', sm: 'flex' },
              '& .MuiBreadcrumbs-ol': {
                flexWrap: 'nowrap',
              },
            }}
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast ? (
                <Typography
                  key={crumb.path}
                  color="text.primary"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}
                >
                  {crumb.icon}
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  key={crumb.path}
                  underline="hover"
                  color="text.secondary"
                  href={crumb.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(crumb.path);
                  }}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>

        {/* Center: Search Bar */}
        <Box sx={{ mx: 3, display: { xs: 'none', md: 'block' } }}>
          <TextField
            placeholder="Search courses, students, assignments..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            size="small"
            sx={{
              width: searchFocused ? 500 : 400,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.default',
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
                '&.Mui-focused': {
                  backgroundColor: 'background.paper',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Search Results Dropdown */}
          <Popover
            open={Boolean(anchorElSearch) && searchResults.length > 0}
            anchorEl={anchorElSearch}
            onClose={() => setAnchorElSearch(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: {
                width: searchFocused ? 500 : 400,
                mt: 1,
                maxHeight: 400,
                overflow: 'auto',
              },
            }}
            disableAutoFocus
            disableEnforceFocus
          >
            <List sx={{ py: 1 }}>
              {searchResults.map((result) => (
                <ListItemButton
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result.path)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon>
                    {result.type === 'course' ? (
                      <SchoolIcon color="primary" />
                    ) : (
                      <AssignmentIcon color="secondary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.title}
                    secondary={result.subtitle}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      fontSize: '0.95rem',
                    }}
                  />
                  <Chip
                    label={result.type}
                    size="small"
                    sx={{ 
                      textTransform: 'capitalize',
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Popover>
        </Box>

        {/* Right: Notifications, Settings, User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationsOpen}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton
            color="inherit"
            onClick={handleSettings}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Theme Toggle */}
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}
            title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {/* User Avatar */}
          <IconButton onClick={handleUserMenuOpen} sx={{ ml: 1 }}>
            <Avatar
              src={currentUser.photoUrl}
              alt={currentUser.name}
              sx={{ width: 40, height: 40 }}
            />
          </IconButton>
        </Box>

        {/* Notifications Popover */}
        <Popover
          open={Boolean(anchorElNotifications)}
          anchorEl={anchorElNotifications}
          onClose={handleNotificationsClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              width: 380,
              mt: 1.5,
              maxHeight: 500,
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
            <Typography variant="caption" color="text.secondary">
              You have {unreadCount} unread notifications
            </Typography>
          </Box>
          
          <List sx={{ py: 0 }}>
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      py: 2,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Icon color={notification.color} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.subtitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.time}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
          
          <Box 
            sx={{ 
              p: 1.5, 
              borderTop: 1, 
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Link
              component="button"
              variant="body2"
              onClick={() => {
                handleNotificationsClose();
                // Navigate to notifications page
              }}
              sx={{
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View All Notifications
            </Link>
          </Box>
        </Popover>

        {/* User Menu */}
        <Menu
          anchorEl={anchorElUser}
          open={Boolean(anchorElUser)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 240,
              borderRadius: 2,
            },
          }}
        >
          <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {currentUser.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentUser.email}
            </Typography>
            <Chip
              label={`Semester ${currentUser.semester}`}
              size="small"
              color="primary"
              sx={{ mt: 1 }}
            />
          </Box>
          
          <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleHelp} sx={{ py: 1.5 }}>
            <ListItemIcon>
              <HelpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Help & Support</ListItemText>
          </MenuItem>
          
          <Divider sx={{ my: 1 }} />
          
          <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
