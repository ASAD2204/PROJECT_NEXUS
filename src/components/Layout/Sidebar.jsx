import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  alpha,
  IconButton,
  Avatar,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  HowToReg as HowToRegIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  MenuBook as MenuBookIcon,
  SupportAgent as SupportAgentIcon,
  ChevronLeft,
  ChevronRight,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { currentUser, assignments, feeInvoices, attendance } from '../../data/dummyData';

// Helper function to check if attendance marked today
const isAttendanceMarkedToday = () => {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(record => record.date === today);
  return todayRecords.length > 0;
};

// Helper function to get pending assignments count
const getPendingAssignmentsCount = () => {
  return assignments.filter(a => a.status === 'Pending').length;
};

// Helper function to check if unpaid invoices exist
const hasUnpaidInvoices = () => {
  return feeInvoices.some(inv => inv.status === 'Unpaid' || inv.status === 'Overdue');
};

// Student menu items
const studentMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'My Courses', icon: SchoolIcon, path: '/lms' },
  { 
    text: 'Attendance', 
    icon: HowToRegIcon, 
    path: '/attendance',
    badge: !isAttendanceMarkedToday() ? 'Mark Now' : null,
    badgeColor: 'warning'
  },
  { 
    text: 'Assignments', 
    icon: AssignmentIcon, 
    path: '/assignments',
    badge: getPendingAssignmentsCount() > 0 ? getPendingAssignmentsCount().toString() : null,
    badgeColor: 'error'
  },
  { 
    text: 'Fee Management', 
    icon: PaymentIcon, 
    path: '/finance',
    badge: hasUnpaidInvoices() ? 'Due' : null,
    badgeColor: 'error'
  },
  { 
    text: 'Nexus Chat', 
    icon: ChatIcon, 
    path: '/chat',
    badge: null,
    badgeColor: 'primary'
  },
  { text: 'Profile', icon: PersonIcon, path: '/profile', divider: true },
  { text: 'Transcript', icon: DescriptionIcon, path: '/transcript' },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/grievances' },
];

// Admin menu items
const adminMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/admin/dashboard' },
  { text: 'User Management', icon: PeopleIcon, path: '/admin/users' },
  { text: 'Course Management', icon: SchoolIcon, path: '/admin/courses' },
  { text: 'Fee Management', icon: PaymentIcon, path: '/finance' },
  { text: 'Reports', icon: AssessmentIcon, path: '/admin/reports', divider: true },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Grievances', icon: SupportAgentIcon, path: '/grievances' },
  { text: 'Settings', icon: SettingsIcon, path: '/admin/settings' },
];

// Teacher menu items
const teacherMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/teacher/dashboard' },
  { text: 'My Courses', icon: SchoolIcon, path: '/teacher/courses' },
  { text: 'Students', icon: GroupIcon, path: '/teacher/students' },
  { 
    text: 'Attendance', 
    icon: HowToRegIcon, 
    path: '/attendance',
  },
  { 
    text: 'Assignments', 
    icon: AssignmentIcon, 
    path: '/assignments',
    badge: '23',
    badgeColor: 'warning'
  },
  { 
    text: 'Nexus Chat', 
    icon: ChatIcon, 
    path: '/chat',
  },
  { text: 'Profile', icon: PersonIcon, path: '/profile', divider: true },
  { text: 'Library', icon: MenuBookIcon, path: '/library' },
  { text: 'Reports', icon: AssessmentIcon, path: '/teacher/reports' },
];

const Sidebar = ({ drawerWidth = 240, mobileOpen, onDrawerToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userType } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get menu items based on user type
  const getMenuItems = () => {
    switch (userType) {
      case 'admin':
        return adminMenuItems;
      case 'teacher':
        return teacherMenuItems;
      default:
        return studentMenuItems;
    }
  };

  const menuItems = getMenuItems();

  const currentDrawerWidth = collapsed && !isMobile ? 64 : drawerWidth;

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const drawer = (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: 0,
        background: `linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      }}
    >
      {/* Logo Area */}
      <Box
        sx={{
          p: collapsed ? 1 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {!collapsed ? (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Box
              sx={{
                width: 150,
                height: 50,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
              }}
            >
              <Typography variant="h5" fontWeight="bold" color="white">
                NEXUS
              </Typography>
            </Box>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.8)">
              Intelligent Campus Platform
            </Typography>
          </Box>
        ) : (
          <SchoolIcon sx={{ fontSize: 32, color: 'white' }} />
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Navigation Items */}
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 2,
          px: collapsed ? 0.5 : 1,
          // Keep comfortable spacing above the footer card.
          pb: 2,
        }}
      >
        <List disablePadding>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            const listItemContent = (
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: collapsed ? '8px' : '12px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                  },
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  py: collapsed ? 1.5 : 1.2,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'white',
                    minWidth: collapsed ? 0 : 40,
                    justifyContent: 'center',
                  }}
                >
                  {collapsed && item.badge ? (
                    <Badge
                      badgeContent={item.badge}
                      color={item.badgeColor || 'error'}
                      max={99}
                      sx={{
                        '& .MuiBadge-badge': {
                          fontWeight: 700,
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                        },
                      }}
                    >
                      <Icon />
                    </Badge>
                  ) : (
                    <Icon />
                  )}
                </ListItemIcon>

                {!collapsed && (
                  <>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.95rem',
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        variant="filled"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          px: 0.75,
                          color: 'white',
                          backgroundColor: alpha(
                            theme.palette[item.badgeColor || 'error']?.light || theme.palette.error.light,
                            0.28
                          ),
                          border: '1px solid',
                          borderColor: alpha(
                            theme.palette[item.badgeColor || 'error']?.light || theme.palette.error.light,
                            0.4
                          ),
                        }}
                      />
                    )}
                  </>
                )}
              </ListItemButton>
            );

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  {collapsed ? (
                    <Tooltip title={item.text} placement="right">
                      {listItemContent}
                    </Tooltip>
                  ) : (
                    listItemContent
                  )}
                </ListItem>
                {item.divider && (
                  <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Footer (always sits at the bottom; never overlaps nav) */}
      <Box sx={{ mt: 'auto', flexShrink: 0 }}>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* User Info Card */}
        <Box
          sx={{
            p: collapsed ? 1 : 1.5,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {!collapsed ? (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Avatar
                src={currentUser.photoUrl}
                alt={currentUser.name}
                sx={{ width: 40, height: 40, mr: 1.5 }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  color="white"
                  fontWeight={600}
                  noWrap
                >
                  {currentUser.name}
                </Typography>
                <Chip
                  label="Student"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    mt: 0.5,
                  }}
                />
              </Box>
            </Box>
          ) : (
            <Tooltip title={currentUser.name} placement="right">
              <Avatar
                src={currentUser.photoUrl}
                alt={currentUser.name}
                sx={{
                  width: 40,
                  height: 40,
                  mx: 'auto',
                  mb: 1,
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          )}

          {/* Logout Button */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={!collapsed && <LogoutIcon />}
            onClick={handleLogoutClick}
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              py: collapsed ? 1.5 : 0.75,
              justifyContent: 'center',
            }}
          >
            {collapsed ? <LogoutIcon /> : 'Logout'}
          </Button>
        </Box>

        {/* Collapse Toggle Button - Desktop Only */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 0.5,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            <IconButton
              onClick={toggleCollapse}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Box
        component="nav"
        sx={{ 
          width: { xs: 0, md: currentDrawerWidth }, 
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRight: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              borderRight: 'none',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
              overflowY: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to logout from Project Nexus?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleLogoutCancel} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            variant="contained" 
            color="error"
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar;
