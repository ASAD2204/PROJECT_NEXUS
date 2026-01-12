# Project Nexus - Unified Intelligent Campus Platform

A high-fidelity, interactive prototype of an intelligent campus management system built with React, Material UI, and modern web technologies.

## 🎯 Project Overview

**Project Nexus** is a comprehensive university campus platform that integrates various academic and administrative services into a unified interface. This is a **frontend prototype** demonstrating the complete user experience using mock data.

### Key Features

- 🔐 **Authentication System** - Login with split-screen design, forgot password, OTP verification
- 📊 **Student Dashboard** - CGPA tracking, attendance overview, pending tasks, GPA trends
- 👤 **Student Profile** - Complete profile management with editable fields
- 📝 **Academic Transcript** - Semester-wise grade reports with CGPA calculation
- ✅ **Smart Attendance** - AI-powered biometric attendance with facial recognition simulation
- 📚 **Learning Management System (LMS)** - Course management, assignments, quizzes, announcements
- 💰 **Fee Management** - View invoices, pay fees with mock payment gateway
- 💬 **Nexus Chat** - AI-powered chatbot with citation support and human support toggle

## 🛠️ Tech Stack

- **Framework:** React 18 + Vite
- **UI Library:** Material UI (MUI v5)
- **Icons:** Material Icons
- **Routing:** React Router v6
- **Charts:** Recharts
- **Language:** JavaScript (ES6+)

## 📁 Project Structure

```
src/
├── assets/              # Images and static assets
├── components/
│   ├── Layout/         # MainLayout, Sidebar, TopBar
│   ├── Common/         # Reusable components (StatCard, StatusBadge, etc.)
│   └── Forms/          # Form components (FileDropzone)
├── contexts/           # React Context (AuthContext)
├── pages/
│   ├── Auth/          # Login, ForgotPassword, OTP
│   ├── Student/       # Dashboard, Profile, Transcript
│   ├── Attendance/    # SmartAttendance, History
│   ├── LMS/           # CourseList, CourseClassroom, AssignmentSubmit
│   ├── Finance/       # FeeVouchers
│   └── Chat/          # ChatPortal
├── data/
│   └── dummyData.js   # Centralized mock database
├── theme.js           # MUI theme configuration
├── App.jsx            # Route definitions
└── main.jsx           # Application entry point
```

## 🎨 Design System

### Colors
- **Primary (Academic Blue):** `#1976D2` - Used for AppBars, primary buttons
- **Secondary (Teal):** `#00796B` - Used for success states, "Pay Now" buttons
- **Background:** `#F4F6F8` - Application background
- **Surface:** `#FFFFFF` - Card backgrounds

### Typography
- Font Family: Roboto, Helvetica, Arial, sans-serif
- Border Radius: 12px for cards and buttons

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Navigate to project directory**
   ```bash
   cd "f:\BS IT\Project_Nexus"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   - Navigate to `http://localhost:5173/`

### Demo Credentials

Since this is a prototype with mock data, you can login with **any email and password**:
- Email: `any@email.com`
- Password: `any`

## 📱 Available Routes

### Public Routes
- `/login` - Login page with split-screen design
- `/forgot-password` - Password recovery
- `/otp` - OTP verification

### Protected Routes (Requires Authentication)
- `/dashboard` - Student dashboard with stats and charts
- `/profile` - Student profile management
- `/transcript` - Academic transcript
- `/attendance` - Smart attendance marking
- `/attendance/history` - Attendance history
- `/lms` - Course list
- `/lms/course/:id` - Course classroom
- `/lms/assignment/:id` - Assignment submission
- `/finance` - Fee management and payment
- `/chat` - Nexus AI chat portal

## 🎯 Key Components

### Authentication
- **Login.jsx** - Split-screen design with image overlay and form
- **ForgotPassword.jsx** - Email-based password recovery
- **OTP.jsx** - 6-digit OTP verification

### Dashboard Features
- **StatCard** - Reusable statistics card with trend indicators
- **GPA Chart** - Line chart showing semester-wise GPA trends
- **Attendance Progress** - Circular progress indicator
- **Quick Actions** - Shortcuts to common tasks

### Smart Attendance
- **Biometric Interface** - Simulated camera viewport with facial recognition
- **Face Detection** - Green bounding box overlay when face detected
- **Geofence Verification** - Location-based verification
- **Real-time Feedback** - Status indicators and animations

### LMS Features
- **Course Cards** - Visual course representation with progress bars
- **Course Classroom** - Tabbed interface (Stream, Assignments, Quizzes, Content)
- **Assignment Submission** - Drag-and-drop file upload
- **Status Tracking** - Assignment status badges (Pending, Submitted, Graded)

### Finance Module
- **Fee Vouchers** - List view with payment status
- **Payment Gateway** - Mock credit card payment interface
- **Receipt Download** - For paid invoices

### Nexus Chat
- **AI Bot** - Context-aware responses with citations
- **Toggle Mode** - Switch between AI and human support
- **Real-time Chat** - Message history with timestamps

## 🔧 Mock Data

All data is stored in `src/data/dummyData.js` including:
- Student profiles
- Courses and instructors
- Attendance records
- Assignments and quizzes
- Fee invoices
- Chat messages
- GPA history
- Transcript data

### Helper Functions
- `markAttendance()` - Record attendance
- `submitAssignment()` - Submit assignment
- `payInvoice()` - Process payment
- `addChatMessage()` - Add chat message

## 📦 Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🧪 Development Notes

- **No Backend Calls:** This is a frontend-only prototype. Never use `fetch()` calls to localhost.
- **Mock Data:** All business logic uses the mock data from `dummyData.js`.
- **Responsive Design:** All components are mobile-responsive using MUI Grid system.
- **Protected Routes:** Authentication is handled via React Context and localStorage.

## 🎓 Academic Context

**Institution:** University Project
**Course:** Final Year Project (FYP)
**Student:** Muhammad Asad
**Program:** BS Information Technology
**Role:** Frontend Developer & UI/UX Designer

## 📄 License

This is an academic project created for educational purposes.

---

**Built with ❤️ using React + Vite + Material UI**
