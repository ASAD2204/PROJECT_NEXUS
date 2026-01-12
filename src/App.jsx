import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './components/Layout/MainLayout';

// Auth Pages
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import OTP from './pages/Auth/OTP';

// Student Pages
import Dashboard from './pages/Student/Dashboard';
import Profile from './pages/Student/Profile';
import Transcript from './pages/Student/Transcript';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import UserManagement from './pages/Admin/UserManagement';
import CourseManagement from './pages/Admin/CourseManagement';
import AdminReports from './pages/Admin/Reports';

// Teacher Pages
import TeacherDashboard from './pages/Teacher/Dashboard';
import TeacherCourses from './pages/Teacher/MyCourses';
import StudentManagement from './pages/Teacher/StudentManagement';

// Attendance Pages
import SmartAttendance from './pages/Attendance/SmartAttendance';
import AttendanceHistory from './pages/Attendance/History';

// LMS Pages
import CourseList from './pages/LMS/CourseList';
import CourseClassroom from './pages/LMS/CourseClassroom';
import AssignmentSubmit from './pages/LMS/AssignmentSubmit';

// Finance Pages
import FeeVouchers from './pages/Finance/FeeVouchers';

// Chat Pages
import ChatPortal from './pages/Chat/ChatPortal';

// Other Pages
import Library from './pages/Library/Library';
import Grievances from './pages/Grievances/Grievances';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { userType } = useAuth();

  // Default dashboard based on user type
  const getDefaultDashboard = () => {
    switch (userType) {
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/otp" element={<OTP />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultDashboard()} />} />
        
        {/* Student Routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="transcript" element={<Transcript />} />
        
        {/* Admin Routes */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/courses" element={<CourseManagement />} />
        <Route path="admin/reports" element={<AdminReports />} />
        
        {/* Teacher Routes */}
        <Route path="teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="teacher/courses" element={<TeacherCourses />} />
        <Route path="teacher/students" element={<StudentManagement />} />
        <Route path="teacher/course/:id" element={<CourseClassroom />} />
        
        {/* Attendance Routes */}
        <Route path="attendance" element={<SmartAttendance />} />
        <Route path="attendance/history" element={<AttendanceHistory />} />
        
        {/* LMS Routes */}
        <Route path="lms" element={<CourseList />} />
        <Route path="lms/course/:id" element={<CourseClassroom />} />
        <Route path="lms/assignment/:id" element={<AssignmentSubmit />} />
        <Route path="assignments" element={<CourseList />} />
        
        {/* Finance Routes */}
        <Route path="finance" element={<FeeVouchers />} />
        
        {/* Chat Routes */}
        <Route path="chat" element={<ChatPortal />} />
        
        {/* Other Routes */}
        <Route path="library" element={<Library />} />
        <Route path="grievances" element={<Grievances />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
