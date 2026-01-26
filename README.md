<div align="center">

# 🎓 Project Nexus
###The Unified Intelligent Campus Management Platform

**Project ID:** `FYDP-BSIT-2504`

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.3.6-007FFF?style=for-the-badge&logo=mui&logoColor=white)](https://mui.com/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**A comprehensive university management system with role-based portals for Students, Teachers, Administrators, Alumni, and Librarians**

[Live Demo](https://ASAD2204.github.io/PROJECT_NEXUS) • [Documentation](PROJECT_DOCUMENTATION.md) • [Quick Start](QUICKSTART.md)

---

</div>

## 📖 Table of Contents

- [About The Project](#-about-the-project)
- [Project Team](#-project-team)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [User Roles & Modules](#-user-roles--modules)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Contributing](#-Feedback & Contact)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 About The Project

**Project Nexus** is a Final Year Project (FYP) - a high-fidelity, fully interactive prototype of an intelligent campus management ecosystem. Built with modern web technologies, it demonstrates a complete university administration platform that streamlines academic processes, enhances communication, and provides data-driven insights for decision-making.

### 🎓 FYP Context

This prototype showcases:
- **Enterprise-level application architecture** with scalable component design
- **Role-based access control** with dedicated portals for 5 user types
- **Responsive design** that works seamlessly across desktop, tablet, and mobile devices
- **Modern UI/UX patterns** following Material Design 3 principles
- **Real-world workflows** simulating actual university operations with comprehensive mock data

### 🌟 Why Project Nexus?

Traditional university systems are often fragmented across multiple platforms. Project Nexus unifies all essential services into a single, cohesive interface, providing:

- ✅ **Centralized Access** - One platform for all academic and administrative needs
- ✅ **Enhanced Communication** - Integrated messaging, announcements, and support systems
- ✅ **Data-Driven Insights** - Real-time analytics and comprehensive reporting
- ✅ **Modern Experience** - Intuitive interface with smooth animations and responsive design
- ✅ **Scalable Architecture** - Component-based design ready for future expansion

---
## 👥 Project Team

This project is developed by the Final Year Students of BS Information Technology (Session 2022-2026).

| Name | Roll Number | 
| :--- | :--- | 
| **Muhammad Asad** | BIT22031 |
| **Muhammad Saad** | BIT22034 | 
| **Muhammad Hanzla** | BIT22002 | 

### 🎓 Supervisor
**Dr. Ghulam Mustafa** Department of Information Technology  
University of the Punjab, Gujranwala Campus

---


## ✨ Key Features

### 🔐 Authentication & Security
- **Split-screen login** with elegant design
- **Role-based access control** (Student, Teacher, Admin, Alumni, Librarian)
- **Password recovery** with OTP verification
- **Secure session management** with context-based authentication
- 
### 📊 Student Portal
- **Interactive Dashboard** with CGPA tracking, attendance overview, and pending tasks
- **Profile Management** with editable fields and document uploads
- **Academic Transcript** with semester-wise grades and CGPA calculation
- **Smart Attendance** with QR code scanning and GPS verification
- **Assignment Management** with submission tracking and grading
- **Fee Management** with payment gateway integration and voucher downloads

### 👨‍🏫 Teacher Portal
- **Comprehensive Dashboard** with course analytics and student performance metrics
- **Course Management** with content creation, assignments, and quizzes
- **Attendance Tracking** with bulk operations and history reports
- **Student Management** with performance monitoring and grade reporting
- **Quiz Creator** with multiple question types and automatic grading
- **Grievance Management** for handling student academic concerns

### 👔 Admin Portal
- **Executive Dashboard** with system-wide analytics and KPIs
- **User Management** for students, faculty, and administrators
- **Course Management** with enrollment tracking and resource allocation
- **Financial Management** with fee collection monitoring and reports
- **Announcement System** for campus-wide communications
- **Comprehensive Reports** with export functionality (PDF, Excel)
- **Settings & Configuration** for system customization

### 🎓 Alumni Portal
- **Alumni Network** with directory and professional profiles
- **Event Management** for reunions, networking events, and seminars
- **Mentorship Programs** connecting alumni with current students
- **Job Board** with career opportunities from alumni companies

### 📚 Library Management
- **Digital Catalog** with advanced search and filtering
- **Book Management** (issue, return, reserve)
- **Librarian Dashboard** with circulation statistics
- **Due Date Tracking** with automated reminders

### 💬 Communication Systems
- **Chat Portal** with AI-powered assistance
- **Grievance System** with ticket tracking and resolution workflows
- **Help & Support** with FAQ and contact options
- **Announcement Broadcasting** across user groups

### 📈 Analytics & Reporting
- **Interactive Charts** using Recharts library
- **Performance Metrics** with trend analysis
- **Attendance Reports** with visual representations
- **Financial Reports** with revenue tracking
- **Export Capabilities** in multiple formats

---

## 🛠️ Tech Stack

### Frontend Core
```json
{
  "framework": "React 19.2 with latest concurrent features",
  "buildTool": "Vite 7.x for lightning-fast HMR",
  "routing": "React Router DOM 7.x with nested routes",
  "language": "JavaScript ES6+ with modern syntax"
}
```

### UI & Styling
- **Material-UI v7.3.6** - Latest Material Design 3 components
  - Grid v7 with responsive `size` API
  - Theme customization with light/dark mode support
  - Advanced component library (DataGrid, Lab components)
- **Emotion** - CSS-in-JS for dynamic styling
- **Framer Motion** - Smooth page transitions and animations
- **Recharts** - Beautiful, responsive charts and graphs

### State Management
- **React Context API** - Global authentication state
- **React Hooks** - Local component state (useState, useEffect, useContext)
- **Custom Hooks** - Reusable logic encapsulation

### Development Tools
- **ESLint** - Code quality and consistency enforcement
- **Vite Dev Server** - Hot Module Replacement (HMR)
- **Git** - Version control and collaboration
- **GitHub Pages** - Prototype deployment

### Key Dependencies
```json
{
  "react": "^19.2.0",
  "@mui/material": "^7.3.6",
  "@mui/x-data-grid": "^8.23.0",
  "framer-motion": "^12.23.26",
  "recharts": "^3.6.0",
  "react-router-dom": "^7.11.0"
}
```

---

## 🏗️ Project Architecture

### Component-Based Design
```
┌─────────────────────────────────────────┐
│          React Application              │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │        Authentication Layer        │ │
│  │  (Context API + Protected Routes) │ │
│  └────────────────────────────────────┘ │
│                   │                      │
│  ┌────────────────┴────────────────┐   │
│  │        Main Layout               │   │
│  │  ┌──────────┐  ┌──────────────┐ │   │
│  │  │ Sidebar  │  │   TopBar     │ │   │
│  │  └──────────┘  └──────────────┘ │   │
│  │  ┌──────────────────────────────┐│   │
│  │  │      Page Components         ││   │
│  │  │   (Role-based Routing)       ││   │
│  │  └──────────────────────────────┘│   │
│  └──────────────────────────────────┘   │
│                   │                      │
│  ┌────────────────┴────────────────┐   │
│  │    Common Components             │   │
│  │ StatCard | PageHeader | Badges  │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Folder Structure Philosophy
- **Separation of Concerns** - Each module has distinct responsibilities
- **Reusability** - Common components shared across pages
- **Scalability** - Easy to add new features and modules
- **Maintainability** - Clear organization for easy navigation

---

## 👥 User Roles & Modules

### 🎓 Student (Primary User)
**Dashboard**: Overview of academic performance, attendance, and tasks  
**Profile**: Personal information, documents, and settings  
**Academics**: Transcript, courses, assignments, quizzes  
**Attendance**: Smart marking with QR/GPS, history viewing  
**Finance**: Fee vouchers, payment processing, receipts  
**Communication**: Chat support, grievance submission  

### 👨‍🏫 Teacher (Faculty Member)
**Dashboard**: Course analytics, student performance, pending tasks  
**Courses**: Content management, resource uploads  
**Assignments**: Creation, submission tracking, grading  
**Quizzes**: Quiz builder with multiple question types  
**Attendance**: Class-wise marking, bulk operations, reports  
**Students**: Performance monitoring, grade management  
**Grievances**: Academic issue resolution  

### 👔 Administrator (System Admin)
**Dashboard**: System-wide KPIs and analytics  
**User Management**: CRUD operations for all users  
**Course Management**: Program and course setup  
**Financial Management**: Fee tracking, payment monitoring  
**Reports**: Comprehensive analytics and exports  
**Announcements**: Campus-wide communication  
**Settings**: System configuration and customization  

### 🎓 Alumni (Graduated Students)
**Network**: Alumni directory with search  
**Events**: Reunions, networking events, seminars  
**Profile**: Professional information and achievements  
**Mentorship**: Connection with current students  

### 📚 Librarian (Library Staff)
**Catalog**: Book search and management  
**Circulation**: Issue, return, reserve operations  
**Dashboard**: Borrowing statistics and analytics  
**Members**: Student library account management  

---


```
Project_Nexus/
│
├── 📂 public/                      # Static assets and favicon
│
├── 📂 src/                        # Application source code
│   │
│   ├── 📂 assets/                 # Images, logos, media files
│   │   └── react.svg
│   │
│   ├── 📂 components/             # Reusable React components
│   │   ├── 📂 Layout/            # Application layout structure
│   │   │   ├── MainLayout.jsx   # Main container with sidebar
│   │   │   ├── Sidebar.jsx      # Role-based navigation menu
│   │   │   └── TopBar.jsx       # Header with user info & notifications
│   │   │
│   │   ├── 📂 Common/            # Shared UI components
│   │   │   ├── PageHeader.jsx   # Page title with breadcrumbs
│   │   │   ├── StatCard.jsx     # Dashboard statistics cards
│   │   │   ├── StatusBadge.jsx  # Color-coded status indicators
│   │   │   └── LoadingSkeleton.jsx  # Loading placeholders
│   │   │
│   │   └── 📂 Forms/             # Form-related components
│   │       └── FileDropzone.jsx # Drag-and-drop file uploader
│   │
│   ├── 📂 contexts/               # React Context for state management
│   │   ├── AuthContext.jsx      # Authentication state & logic
│   │   └── ThemeContext.jsx     # Theme switching (light/dark)
│   │
│   ├── 📂 data/                   # Mock data for prototype
│   │   └── dummyData.js         # Centralized mock database
│   │
│   ├── 📂 pages/                  # Page components organized by module
│   │   │
│   │   ├── 📂 Auth/              # Authentication pages
│   │   │   ├── Login.jsx        # Split-screen login interface
│   │   │   ├── ForgotPassword.jsx  # Password recovery
│   │   │   └── OTP.jsx          # 6-digit OTP verification
│   │   │
│   │   ├── 📂 Student/           # Student portal pages
│   │   │   ├── Dashboard.jsx    # Student overview & quick stats
│   │   │   ├── Profile.jsx      # Profile management with tabs
│   │   │   └── Transcript.jsx   # Academic records & GPA
│   │   │
│   │   ├── 📂 Teacher/           # Teacher portal pages
│   │   │   ├── Dashboard.jsx    # Teacher analytics overview
│   │   │   ├── MyCourses.jsx    # Assigned courses management
│   │   │   ├── StudentManagement.jsx  # Grade & track students
│   │   │   ├── CreateQuiz.jsx   # Quiz builder interface
│   │   │   ├── Quizzes.jsx      # Quiz management dashboard
│   │   │   ├── TeacherAttendance.jsx  # Mark attendance
│   │   │   ├── ViewSubmissions.jsx    # Review assignments
│   │   │   ├── CourseManagement.jsx   # Course content editor
│   │   │   ├── GrievanceManagement.jsx  # Handle student issues
│   │   │   ├── Reports.jsx      # Teacher analytics
│   │   │   └── Profile.jsx      # Teacher profile
│   │   │
│   │   ├── 📂 Admin/             # Administrator portal
│   │   │   ├── Dashboard.jsx    # System-wide analytics
│   │   │   ├── UserManagement.jsx     # Manage all users
│   │   │   ├── CourseManagement.jsx   # Course & program setup
│   │   │   ├── FinanceManagement.jsx  # Fee collection tracking
│   │   │   ├── GrievanceManagement.jsx  # Grievance oversight
│   │   │   ├── AnnouncementManagement.jsx  # Broadcast messages
│   │   │   ├── Reports.jsx      # Comprehensive reporting
│   │   │   └── Settings.jsx     # System configuration
│   │   │
│   │   ├── 📂 Alumni/            # Alumni portal pages
│   │   │   ├── AlumniNetwork.jsx      # Alumni directory
│   │   │   └── AlumniEvents.jsx       # Event management
│   │   │
│   │   ├── 📂 Library/           # Library management
│   │   │   ├── Library.jsx      # Student library interface
│   │   │   ├── LibraryCatalog.jsx     # Book search & browse
│   │   │   └── LibrarianDashboard.jsx # Librarian operations
│   │   │
│   │   ├── 📂 Attendance/        # Attendance module
│   │   │   ├── SmartAttendance.jsx    # QR/GPS attendance marking
│   │   │   └── History.jsx      # Attendance records
│   │   │
│   │   ├── 📂 LMS/               # Learning Management System
│   │   │   ├── CourseList.jsx   # Browse all courses
│   │   │   ├── CourseClassroom.jsx    # Virtual classroom view
│   │   │   └── AssignmentSubmit.jsx   # Submit assignments
│   │   │
│   │   ├── 📂 Finance/           # Financial management
│   │   │   └── FeeVouchers.jsx  # Fee payment interface
│   │   │
│   │   ├── 📂 Chat/              # Communication module
│   │   │   └── ChatPortal.jsx   # AI-powered chat interface
│   │   │
│   │   ├── 📂 Grievances/        # Grievance system
│   │   │   └── Grievances.jsx   # Submit & track grievances
│   │   │
│   │   ├── 📂 Support/           # Help & support
│   │   │   └── HelpSupport.jsx  # FAQ & contact support
│   │   │
│   │   └── 📂 Operations/        # Operations module
│   │       └── Grievances.jsx   # Operations grievance handling
│   │
│   ├── 📂 services/               # API service layer (future integration)
│   │   └── financeService.js    # Finance-related API calls
│   │
│   ├── 📂 styles/                 # Global styles
│   │   └── globalStyles.js      # CSS-in-JS global styles
│   │
│   ├── 📂 utils/                  # Utility functions
│   │   └── animations.js        # Framer Motion animation configs
│   │
│   ├── 📄 App.jsx                # Main app with route definitions
│   ├── 📄 main.jsx               # React entry point & providers
│   └── 📄 theme.js               # MUI theme configuration
│
├── 📄 .gitignore                 # Git ignore patterns
├── 📄 eslint.config.js           # ESLint rules
├── 📄 index.html                 # HTML entry point
├── 📄 package.json               # Dependencies & npm scripts
├── 📄 vite.config.js             # Vite build configuration
│
├── 📄 README.md                  # This file - comprehensive guide
├── 📄 PROJECT_DOCUMENTATION.md   # Detailed technical documentation
├── 📄 PROJECT_STRUCTURE.md       # File structure overview
├── 📄 QUICKSTART.md              # Quick start guide
├── 📄 PROJECT_BUILD_DOCUMENTATION.md  # Build process docs
└── 📄 PHASE_1_2_IMPLEMENTATION.md     # Implementation phases
```

### Component Statistics
- **Total Pages**: 40+ role-specific pages
- **Reusable Components**: 15+ common components
- **User Roles**: 5 distinct portals (Student, Teacher, Admin, Alumni, Librarian)
- **Lines of Code**: ~10,000+ lines
- **Mock Data Entries**: 500+ realistic records

---

## 🚀 Installation & Setup

### Prerequisites
Make sure you have the following installed:
- **Node.js** (v18.0 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Git** - Version control

### Quick Start

1️⃣ **Clone the repository**
```bash
git clone https://github.com/ASAD2204/PROJECT_NEXUS.git
cd PROJECT_NEXUS
```

2️⃣ **Install dependencies**
```bash
npm install
# or
yarn install
```

3️⃣ **Start the development server**
```bash
npm run dev
# or
yarn dev
```

4️⃣ **Open in browser**
```
http://localhost:5173
```

The app will automatically reload when you make changes! 🎉

### Build for Production
```bash
npm run build
npm run preview  # Preview production build locally
```

### Deployment
```bash
npm run deploy  # Deploy to GitHub Pages
```

---

## 📖 Usage Guide

### Login Credentials
The prototype uses mock authentication. Use any of these credentials:

**Student Account**
```
Email: student@nexus.edu
Password: student123
Role: Student
```

**Teacher Account**
```
Email: teacher@nexus.edu
Password: teacher123
Role: Teacher
```

**Admin Account**
```
Email: admin@nexus.edu
Password: admin123
Role: Administrator
```

**Alumni Account**
```
Email: alumni@nexus.edu
Password: alumni123
Role: Alumni
```

**Librarian Account**
```
Email: librarian@nexus.edu
Password: librarian123
Role: Librarian
```

### Navigation Tips

1. **Role Selection**: Choose your role on the login page
2. **Sidebar Navigation**: Use the left sidebar to navigate between modules
3. **Top Bar**: Access notifications, user menu, and theme toggle
4. **Quick Actions**: Dashboard cards provide shortcuts to common tasks
5. **Search & Filter**: Most data tables support search and filtering
6. **Responsive Design**: Try the app on different screen sizes!

### Key Workflows

**📚 Student: Submit an Assignment**
1. Login as Student
2. Go to LMS → Courses
3. Click on a course → Assignments tab
4. Click "Submit Assignment"
5. Upload file and submit

**👨‍🏫 Teacher: Create a Quiz**
1. Login as Teacher
2. Navigate to Quizzes
3. Click "Create Quiz"
4. Add questions (MCQ, True/False, Short Answer)
5. Set time limit and publish

**👔 Admin: Generate Reports**
1. Login as Admin
2. Go to Reports module
3. Select report type (Enrollment, Financial, Performance)
4. Choose date range and filters
5. Export as PDF or Excel

---

## 📸 Screenshots

### 🎨 Authentication System
**Split-Screen Login Interface**  
Modern, elegant login with role selection and brand showcase

**Password Recovery Flow**  
Email verification → OTP input → Password reset

### 📊 Student Portal
**Dashboard Overview**  
- CGPA tracker with visual indicator
- Attendance percentage with color coding
- Upcoming classes schedule
- Recent assignments with due dates
- Quick action buttons

**Smart Attendance**  
- QR code scanning interface
- GPS location verification
- Real-time status updates
- Attendance history with filters

**Academic Transcript**  
- Semester-wise grade display
- GPA and CGPA calculations
- Course details with credit hours
- Visual grade distribution charts

### 👨‍🏫 Teacher Portal
**Teacher Dashboard**  
- Course analytics with charts
- Student performance metrics
- Pending tasks and deadlines
- Quick navigation to courses

**Quiz Creator**  
- Drag-and-drop question builder
- Multiple question types support
- Preview before publishing
- Automatic grading setup

**Student Management**  
- Class roster with photos
- Grade entry and modification
- Performance tracking charts
- Export student reports

### 👔 Admin Portal
**Executive Dashboard**  
- System-wide KPI cards
- Enrollment trends (Line charts)
- Department distribution (Pie charts)
- Revenue tracking (Bar charts)
- Recent activities feed

**User Management**  
- Advanced search and filters
- Bulk operations (import/export)
- Role assignment
- Account activation/deactivation

**Financial Reports**  
- Fee collection analytics
- Payment status tracking
- Due date monitoring
- Revenue reports with exports

### 🎓 Alumni Portal
**Alumni Network**  
- Professional directory with search
- Company affiliations
- Graduation year filters
- Connect with alumni

**Event Management**  
- Upcoming events calendar
- Event registration
- Photo galleries
- Networking opportunities

### 📚 Library Module
**Digital Catalog**  
- Advanced book search
- Genre-based browsing
- Availability status
- Reserve functionality

**Librarian Dashboard**  
- Circulation statistics
- Overdue book tracking
- Popular books analytics
- Member management

---

## 🎨 Design Highlights

### Material Design 3
- Latest MUI components with modern aesthetics
- Consistent color palette across modules
- Elevation and shadow system for depth
- Responsive typography scale

### Animations & Transitions
- Framer Motion page transitions
- Smooth hover effects
- Loading skeletons for better UX
- Micro-interactions for feedback

### Responsive Design
- **Mobile First**: Optimized for all screen sizes
- **Breakpoints**: xs (0px), sm (600px), md (900px), lg (1200px), xl (1536px)
- **Adaptive Layouts**: Components reorganize based on screen size
- **Touch-Friendly**: Large tap targets on mobile devices

### Dark Mode Support
- Theme toggle in top bar
- Automatic color scheme adaptation
- Eye-friendly for night use
- Persistent theme preference

---

## 🔮 Future Enhancements

### Phase 1 (Backend Integration)
- [ ] REST API development with Node.js/Express
- [ ] MongoDB/PostgreSQL database setup
- [ ] JWT authentication implementation
- [ ] Real-time notifications with WebSockets

### Phase 2 (Advanced Features)
- [ ] AI-powered chatbot with NLP
- [ ] Facial recognition for attendance
- [ ] Video conferencing integration
- [ ] Mobile app (React Native)

### Phase 3 (Analytics & ML)
- [ ] Predictive analytics for student performance
- [ ] Recommendation system for courses
- [ ] Automated report generation
- [ ] Dashboard customization

### Phase 4 (Enterprise Features)
- [ ] Multi-tenant architecture
- [ ] Payment gateway integration
- [ ] Email/SMS notifications
- [ ] Document management system
- [ ] Advanced security features (2FA, audit logs)

---

## 📢 Feedback & Contact

This project is **Proprietary** to the University of the Punjab. It is closed for public contributions (Pull Requests are not accepted).

However, we welcome feedback, bug reports, and suggestions. Please contact the project team:

**Email:** bit22031@.pugc.edu.pk (Muhammad Asad)  
**Department:** Information Technology, University of the Punjab, Gujranwala Campus

---

## 📄 License

**© 2025-2026 Department of Information Technology, University of the Punjab, Gujranwala Campus.**

This project is the intellectual property of the University and the student developers. It is developed as part of the Final Year Design Project (FYDP).

**Usage Restrictions:**
1. This software is **Proprietary** and **Not Open Source**.
2. Unauthorized copying, modification, distribution, or commercial use is strictly prohibited.
3. Access to the source code is granted for academic evaluation purposes only.

See the [LICENSE](LICENSE) file for more details.

---

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **Material-UI** for the comprehensive component library
- **Vite** for the blazing-fast build tool
- **Recharts** for beautiful chart components
- **Framer Motion** for smooth animations
- **Open Source Community** for inspiration and resources

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

**Made with ❤️ for Final Year Project**

</div>

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
