// Mock Database for Project Nexus
// This file simulates backend data structures

export const currentUser = {
  id: 'STU001',
  name: 'Muhammad Asad',
  email: 'asad@university.edu',
  rollNo: 'BSIT-2021-001',
  program: 'BS Information Technology',
  semester: 7,
  cgpa: 3.85,
  riskStatus: 'Green', // Green, Yellow, Red
  photoUrl: 'https://i.pravatar.cc/150?img=12',
  phone: '+92 300 1234567',
  address: 'Karachi, Pakistan',
  dob: '2003-05-15',
  bloodGroup: 'O+',
  guardianName: 'Abdul Malik',
  guardianPhone: '+92 300 7654321',
};

export const students = [
  currentUser,
  {
    id: 'STU002',
    name: 'Ayesha Khan',
    email: 'ayesha@university.edu',
    rollNo: 'BSIT-2021-002',
    program: 'BS Information Technology',
    semester: 7,
    cgpa: 3.92,
    riskStatus: 'Green',
    photoUrl: 'https://i.pravatar.cc/150?img=5',
  },
  {
    id: 'STU003',
    name: 'Ahmed Ali',
    email: 'ahmed@university.edu',
    rollNo: 'BSIT-2021-003',
    program: 'BS Information Technology',
    semester: 7,
    cgpa: 2.45,
    riskStatus: 'Red',
    photoUrl: 'https://i.pravatar.cc/150?img=8',
  },
];

export const courses = [
  {
    id: 'CS101',
    code: 'CS101',
    title: 'Data Structures & Algorithms',
    instructor: 'Dr. Sarah Ahmed',
    instructorPhoto: 'https://i.pravatar.cc/150?img=1',
    credits: 3,
    progress: 65,
    coverImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400',
    semester: 'Fall 2025',
    schedule: 'Mon, Wed, Fri - 9:00 AM',
    room: 'Lab 301',
    enrolled: 45,
  },
  {
    id: 'CS202',
    code: 'CS202',
    title: 'Database Management Systems',
    instructor: 'Prof. Ali Raza',
    instructorPhoto: 'https://i.pravatar.cc/150?img=13',
    credits: 4,
    progress: 78,
    coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400',
    semester: 'Fall 2025',
    schedule: 'Tue, Thu - 11:00 AM',
    room: 'Room 205',
    enrolled: 52,
  },
  {
    id: 'CS303',
    code: 'CS303',
    title: 'Web Engineering',
    instructor: 'Dr. Fatima Malik',
    instructorPhoto: 'https://i.pravatar.cc/150?img=9',
    credits: 3,
    progress: 45,
    coverImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
    semester: 'Fall 2025',
    schedule: 'Mon, Wed - 2:00 PM',
    room: 'Lab 102',
    enrolled: 38,
  },
  {
    id: 'CS404',
    code: 'CS404',
    title: 'Artificial Intelligence',
    instructor: 'Dr. Hassan Khan',
    instructorPhoto: 'https://i.pravatar.cc/150?img=15',
    credits: 3,
    progress: 52,
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    semester: 'Fall 2025',
    schedule: 'Tue, Thu - 3:30 PM',
    room: 'Room 401',
    enrolled: 42,
  },
];

export const attendance = [
  { id: 1, courseId: 'CS101', date: '2025-12-29', status: 'Present', checkInTime: '09:05 AM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 2, courseId: 'CS202', date: '2025-12-28', status: 'Present', checkInTime: '11:03 AM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 3, courseId: 'CS303', date: '2025-12-27', status: 'Absent', checkInTime: null, gpsLat: null, gpsLong: null },
  { id: 4, courseId: 'CS101', date: '2025-12-26', status: 'Present', checkInTime: '09:08 AM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 5, courseId: 'CS404', date: '2025-12-25', status: 'Present', checkInTime: '03:32 PM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 6, courseId: 'CS202', date: '2025-12-24', status: 'Present', checkInTime: '11:05 AM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 7, courseId: 'CS101', date: '2025-12-23', status: 'Present', checkInTime: '09:02 AM', gpsLat: 24.8607, gpsLong: 67.0011 },
  { id: 8, courseId: 'CS303', date: '2025-12-22', status: 'Absent', checkInTime: null, gpsLat: null, gpsLong: null },
];

export const attendanceStats = {
  totalClasses: 56,
  attended: 48,
  percentage: 85.7,
};

export const assignments = [
  {
    id: 'ASG001',
    courseId: 'CS101',
    title: 'Binary Search Tree Implementation',
    description: 'Implement a complete BST with insert, delete, and search operations',
    dueDate: '2026-01-05',
    totalMarks: 20,
    status: 'Pending', // Pending, Submitted, Graded
    submittedOn: null,
    obtainedMarks: null,
  },
  {
    id: 'ASG002',
    courseId: 'CS202',
    title: 'Database Normalization Exercise',
    description: 'Normalize the given database schema to 3NF',
    dueDate: '2026-01-08',
    totalMarks: 15,
    status: 'Submitted',
    submittedOn: '2025-12-28',
    obtainedMarks: null,
  },
  {
    id: 'ASG003',
    courseId: 'CS303',
    title: 'Responsive Website Design',
    description: 'Create a responsive landing page using HTML, CSS, and JavaScript',
    dueDate: '2025-12-30',
    totalMarks: 25,
    status: 'Pending',
    submittedOn: null,
    obtainedMarks: null,
  },
  {
    id: 'ASG004',
    courseId: 'CS404',
    title: 'Neural Network Training',
    description: 'Train a neural network for image classification',
    dueDate: '2026-01-12',
    totalMarks: 30,
    status: 'Pending',
    submittedOn: null,
    obtainedMarks: null,
  },
  {
    id: 'ASG005',
    courseId: 'CS101',
    title: 'Sorting Algorithms Comparison',
    description: 'Compare time complexity of QuickSort, MergeSort, and HeapSort',
    dueDate: '2025-12-20',
    totalMarks: 15,
    status: 'Graded',
    submittedOn: '2025-12-18',
    obtainedMarks: 14,
  },
];

export const quizzes = [
  {
    id: 'QZ001',
    courseId: 'CS101',
    title: 'Trees and Graphs Quiz',
    questions: 20,
    duration: 30, // minutes
    dueDate: '2026-01-03',
    status: 'Upcoming',
    totalMarks: 20,
  },
  {
    id: 'QZ002',
    courseId: 'CS202',
    title: 'SQL Queries Quiz',
    questions: 15,
    duration: 25,
    dueDate: '2026-01-10',
    status: 'Upcoming',
    totalMarks: 15,
  },
  {
    id: 'QZ003',
    courseId: 'CS303',
    title: 'JavaScript Basics',
    questions: 25,
    duration: 40,
    dueDate: '2025-12-22',
    status: 'Completed',
    totalMarks: 25,
    obtainedMarks: 22,
  },
];

export const announcements = [
  {
    id: 'ANN001',
    courseId: 'CS101',
    title: 'Mid-term Exam Schedule',
    content: 'Mid-term exam for Data Structures will be held on January 15th, 2026. Topics include Arrays, Linked Lists, Stacks, Queues, and Trees.',
    postedBy: 'Dr. Sarah Ahmed',
    postedOn: '2025-12-28',
    type: 'Exam',
  },
  {
    id: 'ANN002',
    courseId: 'CS202',
    title: 'Guest Lecture on NoSQL Databases',
    content: 'Join us for a special guest lecture on MongoDB and NoSQL database design on January 5th.',
    postedBy: 'Prof. Ali Raza',
    postedOn: '2025-12-26',
    type: 'Event',
  },
  {
    id: 'ANN003',
    courseId: 'CS303',
    title: 'Project Submission Extended',
    content: 'Due to technical issues, the deadline for the final project has been extended to January 20th.',
    postedBy: 'Dr. Fatima Malik',
    postedOn: '2025-12-29',
    type: 'Important',
  },
];

export const feeInvoices = [
  {
    id: 'INV001',
    title: 'Fall 2025 - Tuition Fee',
    amount: 45000,
    currency: 'PKR',
    dueDate: '2026-01-15',
    status: 'Unpaid', // Paid, Unpaid, Overdue, Partial
    paidOn: null,
    semester: 'Fall 2025',
    description: 'Semester tuition fee including lab charges',
  },
  {
    id: 'INV002',
    title: 'Library Fee',
    amount: 2000,
    currency: 'PKR',
    dueDate: '2025-12-31',
    status: 'Overdue',
    paidOn: null,
    semester: 'Fall 2025',
    description: 'Annual library membership and access',
  },
  {
    id: 'INV003',
    title: 'Sports Fee',
    amount: 1500,
    currency: 'PKR',
    dueDate: '2026-01-20',
    status: 'Unpaid',
    paidOn: null,
    semester: 'Fall 2025',
    description: 'Sports and recreational activities fee',
  },
  {
    id: 'INV004',
    title: 'Summer 2025 - Tuition Fee',
    amount: 45000,
    currency: 'PKR',
    dueDate: '2025-07-15',
    status: 'Paid',
    paidOn: '2025-07-10',
    semester: 'Summer 2025',
    description: 'Semester tuition fee',
  },
];

export const chatMessages = [
  {
    id: 1,
    senderId: 'AI',
    senderName: 'Nexus AI Assistant',
    text: 'Hello! I\'m Nexus AI, your campus assistant. How can I help you today?',
    timestamp: '2025-12-29 10:00:00',
    isAiResponse: true,
    citations: null,
  },
  {
    id: 2,
    senderId: currentUser.id,
    senderName: currentUser.name,
    text: 'What are the library timings?',
    timestamp: '2025-12-29 10:01:00',
    isAiResponse: false,
    citations: null,
  },
  {
    id: 3,
    senderId: 'AI',
    senderName: 'Nexus AI Assistant',
    text: 'The university library is open Monday to Friday from 8:00 AM to 8:00 PM, and on Saturdays from 9:00 AM to 5:00 PM. The library remains closed on Sundays and public holidays.',
    timestamp: '2025-12-29 10:01:30',
    isAiResponse: true,
    citations: ['Source: Student Handbook 2025', 'Page 45'],
  },
];

export const gpaHistory = [
  { semester: 'Sem 1', gpa: 3.2 },
  { semester: 'Sem 2', gpa: 3.4 },
  { semester: 'Sem 3', gpa: 3.6 },
  { semester: 'Sem 4', gpa: 3.7 },
  { semester: 'Sem 5', gpa: 3.8 },
  { semester: 'Sem 6', gpa: 3.9 },
  { semester: 'Sem 7', gpa: 3.85 },
];

export const transcript = [
  {
    semester: 1,
    courses: [
      { code: 'CS101', title: 'Programming Fundamentals', credits: 3, grade: 'A', gradePoints: 4.0 },
      { code: 'MATH101', title: 'Calculus I', credits: 3, grade: 'B+', gradePoints: 3.5 },
      { code: 'ENG101', title: 'English Composition', credits: 3, grade: 'A-', gradePoints: 3.7 },
      { code: 'PHY101', title: 'Physics', credits: 3, grade: 'B', gradePoints: 3.0 },
    ],
    semesterGPA: 3.55,
  },
  {
    semester: 2,
    courses: [
      { code: 'CS102', title: 'Object Oriented Programming', credits: 3, grade: 'A', gradePoints: 4.0 },
      { code: 'MATH102', title: 'Discrete Mathematics', credits: 3, grade: 'A-', gradePoints: 3.7 },
      { code: 'CS103', title: 'Digital Logic Design', credits: 4, grade: 'A', gradePoints: 4.0 },
      { code: 'ISL101', title: 'Islamic Studies', credits: 2, grade: 'B+', gradePoints: 3.5 },
    ],
    semesterGPA: 3.82,
  },
];

export const facultyMembers = [
  {
    id: 'FAC001',
    name: 'Dr. Sarah Ahmed',
    email: 'sarah.ahmed@university.edu',
    department: 'Computer Science',
    photoUrl: 'https://i.pravatar.cc/150?img=1',
    designation: 'Associate Professor',
    officeHours: 'Mon-Wed: 2:00 PM - 4:00 PM',
    office: 'Room 502',
  },
  {
    id: 'FAC002',
    name: 'Prof. Ali Raza',
    email: 'ali.raza@university.edu',
    department: 'Computer Science',
    photoUrl: 'https://i.pravatar.cc/150?img=13',
    designation: 'Professor',
    officeHours: 'Tue-Thu: 10:00 AM - 12:00 PM',
    office: 'Room 505',
  },
];

// Helper functions to simulate backend operations
export const markAttendance = (courseId, status) => {
  const newRecord = {
    id: attendance.length + 1,
    courseId,
    date: new Date().toISOString().split('T')[0],
    status,
    checkInTime: status === 'Present' ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
    gpsLat: status === 'Present' ? 24.8607 : null,
    gpsLong: status === 'Present' ? 67.0011 : null,
  };
  attendance.unshift(newRecord);
  return newRecord;
};

export const submitAssignment = (assignmentId, file) => {
  const assignment = assignments.find(a => a.id === assignmentId);
  if (assignment) {
    assignment.status = 'Submitted';
    assignment.submittedOn = new Date().toISOString().split('T')[0];
  }
  return assignment;
};

export const payInvoice = (invoiceId, paymentMethod) => {
  const invoice = feeInvoices.find(inv => inv.id === invoiceId);
  if (invoice) {
    invoice.status = 'Paid';
    invoice.paidOn = new Date().toISOString().split('T')[0];
  }
  return invoice;
};

export const libraryBooks = [
  {
    id: 1,
    title: "Database Systems: The Complete Book",
    author: "Hector Garcia-Molina",
    isbn: "978-0131873254",
    category: "Computer Science",
    publisher: "Pearson",
    year: 2008,
    pages: 1248,
    totalCopies: 5,
    availableCopies: 3,
    coverImage: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=600&fit=crop",
    shelfLocation: "CS-A-104",
    description: "Comprehensive guide to database systems covering data models, relational algebra, SQL, database design, query processing, transaction management, and more. Essential reading for computer science students.",
    language: "English",
    ratings: 4.5,
    reviews: 128,
  },
  {
    id: 2,
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    isbn: "978-0262033848",
    category: "Computer Science",
    publisher: "MIT Press",
    year: 2009,
    pages: 1312,
    totalCopies: 8,
    availableCopies: 5,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
    shelfLocation: "CS-A-215",
    description: "The leading introduction to algorithms. This book provides a comprehensive introduction to the modern study of computer algorithms covering analysis, design, and implementation.",
    language: "English",
    ratings: 4.8,
    reviews: 256,
  },
  {
    id: 3,
    title: "Operating System Concepts",
    author: "Abraham Silberschatz",
    isbn: "978-1118063330",
    category: "Computer Science",
    publisher: "Wiley",
    year: 2012,
    pages: 944,
    totalCopies: 6,
    availableCopies: 2,
    coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=600&fit=crop",
    shelfLocation: "CS-B-088",
    description: "Operating System Concepts continues to provide a solid theoretical foundation for understanding operating systems, covering process management, memory management, storage management, protection and security.",
    language: "English",
    ratings: 4.3,
    reviews: 187,
  },
  {
    id: 4,
    title: "Computer Networks",
    author: "Andrew S. Tanenbaum",
    isbn: "978-0132126953",
    category: "Information Technology",
    publisher: "Prentice Hall",
    year: 2010,
    pages: 960,
    totalCopies: 7,
    availableCopies: 7,
    coverImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    shelfLocation: "IT-C-142",
    description: "This classic best seller has been thoroughly updated to reflect the newest and most exciting advances in networking. Features coverage of wireless networks, 3G cellular, Gigabit Ethernet, and more.",
    language: "English",
    ratings: 4.6,
    reviews: 203,
  },
  {
    id: 5,
    title: "Artificial Intelligence: A Modern Approach",
    author: "Stuart Russell",
    isbn: "978-0136042594",
    category: "Computer Science",
    publisher: "Prentice Hall",
    year: 2010,
    pages: 1152,
    totalCopies: 4,
    availableCopies: 0,
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop",
    shelfLocation: "CS-D-225",
    description: "The long-anticipated revision of this best-selling text offers the most comprehensive, up-to-date introduction to the theory and practice of artificial intelligence.",
    language: "English",
    ratings: 4.7,
    reviews: 342,
  },
  {
    id: 6,
    title: "Software Engineering",
    author: "Ian Sommerville",
    isbn: "978-0137035151",
    category: "Computer Science",
    publisher: "Addison-Wesley",
    year: 2015,
    pages: 816,
    totalCopies: 5,
    availableCopies: 4,
    coverImage: "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=400&h=600&fit=crop",
    shelfLocation: "CS-A-301",
    description: "For courses in computer science and software engineering. The fundamental practice of software engineering. Presents a broad perspective on software systems engineering.",
    language: "English",
    ratings: 4.4,
    reviews: 156,
  },
  {
    id: 7,
    title: "Data Structures and Algorithms in Java",
    author: "Robert Lafore",
    isbn: "978-0672324536",
    category: "Computer Science",
    publisher: "Sams Publishing",
    year: 2017,
    pages: 800,
    totalCopies: 6,
    availableCopies: 3,
    coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=600&fit=crop",
    shelfLocation: "CS-B-156",
    description: "Data Structures and Algorithms in Java provides an introduction to data structures and algorithms, including their design, analysis, and implementation.",
    language: "English",
    ratings: 4.2,
    reviews: 94,
  },
  {
    id: 8,
    title: "Discrete Mathematics",
    author: "Kenneth H. Rosen",
    isbn: "978-0073383095",
    category: "Mathematics",
    publisher: "McGraw-Hill",
    year: 2011,
    pages: 972,
    totalCopies: 10,
    availableCopies: 8,
    coverImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=600&fit=crop",
    shelfLocation: "MATH-A-045",
    description: "Discrete Mathematics and its Applications is a focused introduction to the primary themes in a discrete mathematics course.",
    language: "English",
    ratings: 4.5,
    reviews: 221,
  },
  {
    id: 9,
    title: "Business Intelligence",
    author: "Efraim Turban",
    isbn: "978-0470526934",
    category: "Business",
    publisher: "Wiley",
    year: 2013,
    pages: 720,
    totalCopies: 4,
    availableCopies: 4,
    coverImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop",
    shelfLocation: "BUS-C-089",
    description: "The book presents the fundamentals of business intelligence in a user-friendly format with real-world examples and case studies.",
    language: "English",
    ratings: 4.1,
    reviews: 78,
  },
  {
    id: 10,
    title: "Computer Organization and Design",
    author: "David A. Patterson",
    isbn: "978-0124077263",
    category: "Computer Science",
    publisher: "Morgan Kaufmann",
    year: 2013,
    pages: 800,
    totalCopies: 5,
    availableCopies: 2,
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=600&fit=crop",
    shelfLocation: "CS-A-178",
    description: "The classic textbook that builds a strong foundation in the fundamentals of computer organization and design.",
    language: "English",
    ratings: 4.6,
    reviews: 167,
  },
  {
    id: 11,
    title: "Physics for Scientists",
    author: "Raymond A. Serway",
    isbn: "978-1133954156",
    category: "Science",
    publisher: "Cengage Learning",
    year: 2013,
    pages: 1616,
    totalCopies: 8,
    availableCopies: 6,
    coverImage: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=600&fit=crop",
    shelfLocation: "SCI-A-234",
    description: "Achieve success in your physics course by making the most of what this best-selling physics text has to offer.",
    language: "English",
    ratings: 4.3,
    reviews: 142,
  },
  {
    id: 12,
    title: "Web Development with Node.js",
    author: "Bruno Joseph",
    isbn: "978-1617294143",
    category: "Information Technology",
    publisher: "Manning",
    year: 2018,
    pages: 392,
    totalCopies: 3,
    availableCopies: 1,
    coverImage: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=600&fit=crop",
    shelfLocation: "IT-B-267",
    description: "Learn to build fast and scalable web applications with Node.js. This book covers Express.js, MongoDB, and modern JavaScript.",
    language: "English",
    ratings: 4.4,
    reviews: 89,
  },
];

export const libraryTransactions = [
  {
    id: 'LTX-1001',
    studentId: 'STU001',
    studentName: 'Muhammad Asad',
    isbn: '978-0131873254',
    bookTitle: 'Database Systems: The Complete Book',
    issuedOn: '2026-01-05',
    dueDate: '2026-02-04',
    status: 'Issued',
    condition: 'Good',
    fine: 0,
  },
  {
    id: 'LTX-1002',
    studentId: 'STU002',
    studentName: 'Ayesha Khan',
    isbn: '978-1118063330',
    bookTitle: 'Operating System Concepts',
    issuedOn: '2026-01-10',
    dueDate: '2026-02-09',
    status: 'Issued',
    condition: 'Good',
    fine: 0,
  },
];

export const issueBookTransaction = (studentId, studentName, isbn) => {
  const book = libraryBooks.find((b) => b.isbn === isbn);
  if (!book || book.availableCopies < 1) {
    return { success: false, message: 'Book not available.' };
  }
  const issuedOn = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const transaction = {
    id: `LTX-${String(libraryTransactions.length + 1000)}`,
    studentId,
    studentName,
    isbn,
    bookTitle: book.title,
    issuedOn,
    dueDate,
    status: 'Issued',
    condition: 'Good',
    fine: 0,
  };
  libraryTransactions.unshift(transaction);
  book.availableCopies -= 1;
  return { success: true, transaction };
};

export const returnBookTransaction = (transactionId, condition) => {
  const transaction = libraryTransactions.find((t) => t.id === transactionId);
  if (!transaction) {
    return { success: false, message: 'Transaction not found.' };
  }
  const book = libraryBooks.find((b) => b.isbn === transaction.isbn);
  if (book) {
    book.availableCopies += 1;
  }
  transaction.status = 'Returned';
  transaction.condition = condition;
  transaction.fine = condition === 'Damaged' ? 500 : condition === 'Lost' ? 2000 : 0;
  return { success: true, transaction };
};

export const myIssuedBooks = [
  {
    id: 1,
    bookId: 1,
    bookTitle: "Database Systems: The Complete Book",
    issueDate: "2025-12-15",
    dueDate: "2026-01-15",
    status: "issued",
    fine: 0,
  },
  {
    id: 2,
    bookId: 3,
    bookTitle: "Operating System Concepts",
    issueDate: "2025-12-20",
    dueDate: "2026-01-20",
    status: "issued",
    fine: 0,
  },
];

export const myReservedBooks = [
  {
    id: 1,
    bookId: 5,
    bookTitle: "Artificial Intelligence: A Modern Approach",
    reservedDate: "2026-01-02",
    expiresOn: "2026-01-09",
    status: "reserved",
  },
];

export const readingHistory = [
  {
    id: 1,
    bookId: 2,
    bookTitle: "Introduction to Algorithms",
    issueDate: "2025-10-01",
    returnDate: "2025-10-28",
    status: "returned",
  },
  {
    id: 2,
    bookId: 7,
    bookTitle: "Data Structures and Algorithms in Java",
    issueDate: "2025-11-05",
    returnDate: "2025-12-02",
    status: "returned",
  },
  {
    id: 3,
    bookId: 6,
    bookTitle: "Software Engineering",
    issueDate: "2025-09-12",
    returnDate: "2025-10-10",
    status: "returned",
  },
];

export const reserveBook = (bookId) => {
  // Check eligibility: User must have < 3 books issued
  if (myIssuedBooks.length >= 3) {
    return { 
      success: false, 
      message: '❌ Cannot reserve: You have reached the maximum limit of 3 issued books.' 
    };
  }

  const book = libraryBooks.find(b => b.id === bookId);
  
  if (!book) {
    return { success: false, message: '❌ Book not found.' };
  }

  if (book.availableCopies <= 0) {
    return { success: false, message: '❌ Book not available for reservation.' };
  }

  // Create reservation with 24-hour timer
  const now = new Date();
  const expiresOn = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  const reservation = {
    id: myReservedBooks.length + 1,
    bookId: bookId,
    bookTitle: book.title,
    reservedDate: now.toISOString().split('T')[0],
    reservedTime: now.toLocaleTimeString(),
    expiresOn: expiresOn.toISOString().split('T')[0],
    expiresTime: expiresOn.toLocaleTimeString(),
    status: 'reserved',
  };

  // Decrement available copies and set status to Reserved
  myReservedBooks.push(reservation);
  book.availableCopies--;

  return { 
    success: true, 
    message: `✅ Book reserved successfully! Please pick up from library within 24 hours. Reservation expires on ${expiresOn.toLocaleDateString()} at ${expiresOn.toLocaleTimeString()}.` 
  };
};

export const returnBook = (issuedBookId) => {
  const index = myIssuedBooks.findIndex(b => b.id === issuedBookId);
  if (index !== -1) {
    const issuedBook = myIssuedBooks[index];
    const book = libraryBooks.find(b => b.id === issuedBook.bookId);
    if (book) {
      book.availableCopies++;
    }
    myIssuedBooks.splice(index, 1);
    readingHistory.push({
      id: readingHistory.length + 1,
      bookId: issuedBook.bookId,
      bookTitle: issuedBook.bookTitle,
      issueDate: issuedBook.issueDate,
      returnDate: new Date().toISOString().split('T')[0],
      status: 'returned',
    });
    return { success: true, message: 'Book returned successfully!' };
  }
  return { success: false, message: 'Book not found.' };
};

export const renewBook = (issuedBookId) => {
  const book = myIssuedBooks.find(b => b.id === issuedBookId);
  if (book) {
    const newDueDate = new Date(book.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 14);
    book.dueDate = newDueDate.toISOString().split('T')[0];
    return { success: true, message: 'Book renewed for 14 more days!' };
  }
  return { success: false, message: 'Book not found.' };
};

export const grievances = [
  {
    id: 1,
    ticketId: "GRV-2026-001",
    category: "Academic",
    priority: "High",
    subject: "Unable to access course materials",
    description: "I cannot access CS101 course materials on the LMS portal. The page shows an error 'Access Denied' whenever I try to open lecture slides or assignments. I have tried multiple times and also cleared my browser cache but the issue persists.",
    status: "In Progress",
    sentimentScore: -0.65,
    submittedAt: "2026-01-02T10:30:00",
    updatedAt: "2026-01-03T14:20:00",
    resolvedAt: null,
    slaDeadline: "2026-01-04T18:30:00",
    assignedTo: "HOD CS Department",
    attachments: ["screenshot.png", "error_log.txt"],
    comments: [
      { 
        id: 1, 
        author: "Muhammad Asad", 
        role: "Student",
        text: "I have attached screenshots of the error message. Please help urgently as I have an assignment due tomorrow.", 
        timestamp: "2026-01-02T10:35:00" 
      },
      { 
        id: 2, 
        author: "Dr. Ahmed Khan", 
        role: "Admin",
        text: "We are looking into this issue. It seems to be a permission issue. Our IT team is working on it.", 
        timestamp: "2026-01-03T14:20:00" 
      }
    ],
    resolution: null,
    satisfactionRating: null,
  },
  {
    id: 2,
    ticketId: "GRV-2026-002",
    category: "Finance",
    priority: "Medium",
    subject: "Fee voucher not generated",
    description: "My fee voucher for Spring 2026 semester has not been generated yet. I need to pay my fees before the deadline.",
    status: "Resolved",
    sentimentScore: 0.3,
    submittedAt: "2025-12-28T09:15:00",
    updatedAt: "2025-12-29T16:45:00",
    resolvedAt: "2025-12-29T16:45:00",
    slaDeadline: "2025-12-30T09:15:00",
    assignedTo: "Finance Office",
    attachments: [],
    comments: [
      { 
        id: 1, 
        author: "Muhammad Asad", 
        role: "Student",
        text: "My roll number is BSIT-2021-001. Please generate my fee voucher.", 
        timestamp: "2025-12-28T09:20:00" 
      },
      { 
        id: 2, 
        author: "Ms. Fatima Ali", 
        role: "Admin",
        text: "Your fee voucher has been generated. You can download it from the Finance portal.", 
        timestamp: "2025-12-29T16:45:00" 
      }
    ],
    resolution: "Fee voucher has been generated and sent to your email. You can also download it from the Finance > Fee Vouchers section.",
    satisfactionRating: null,
  },
  {
    id: 3,
    ticketId: "GRV-2026-003",
    category: "Technical",
    priority: "Low",
    subject: "Slow internet in library",
    description: "The WiFi connection in the library is very slow. It takes forever to load pages and download research papers.",
    status: "Open",
    sentimentScore: -0.3,
    submittedAt: "2026-01-03T11:20:00",
    updatedAt: "2026-01-03T11:20:00",
    resolvedAt: null,
    slaDeadline: "2026-01-06T11:20:00",
    assignedTo: "IT Department",
    attachments: [],
    comments: [],
    resolution: null,
    satisfactionRating: null,
  },
  {
    id: 4,
    ticketId: "GRV-2025-145",
    category: "Facilities",
    priority: "Medium",
    subject: "Air conditioning not working in Lab 2",
    description: "The air conditioning system in Computer Lab 2 has not been working for the past week. It's very hot and uncomfortable.",
    status: "Closed",
    sentimentScore: -0.5,
    submittedAt: "2025-12-20T14:30:00",
    updatedAt: "2025-12-22T10:15:00",
    resolvedAt: "2025-12-22T10:15:00",
    slaDeadline: "2025-12-22T14:30:00",
    assignedTo: "Facilities Management",
    attachments: [],
    comments: [
      { 
        id: 1, 
        author: "Muhammad Asad", 
        role: "Student",
        text: "The temperature is unbearable. Please fix this urgently.", 
        timestamp: "2025-12-20T14:35:00" 
      },
      { 
        id: 2, 
        author: "Mr. Kashif Mahmood", 
        role: "Admin",
        text: "Maintenance team has been notified. They will fix it by tomorrow.", 
        timestamp: "2025-12-21T09:00:00" 
      },
      { 
        id: 3, 
        author: "Mr. Kashif Mahmood", 
        role: "Admin",
        text: "AC has been repaired and is now working properly.", 
        timestamp: "2025-12-22T10:15:00" 
      }
    ],
    resolution: "The air conditioning system has been repaired by our maintenance team. Cooling is now functioning normally.",
    satisfactionRating: 5,
  },
];

export const submitGrievance = (grievanceData) => {
  const newGrievance = {
    id: grievances.length + 1,
    ticketId: `GRV-2026-${String(grievances.length + 1).padStart(3, '0')}`,
    ...grievanceData,
    status: "Submitted",
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
    assignedTo: grievanceData.category === "Academic" ? "Academic Office" : 
                grievanceData.category === "Finance" ? "Finance Office" :
                grievanceData.category === "Technical" ? "IT Department" :
                grievanceData.category === "Facilities" ? "Facilities Management" : "Admin Office",
    comments: [],
    resolution: null,
    satisfactionRating: null,
  };
  grievances.unshift(newGrievance);
  return { success: true, message: 'Grievance submitted successfully!', ticketId: newGrievance.ticketId };
};

export const addGrievanceComment = (grievanceId, commentText) => {
  const grievance = grievances.find(g => g.id === grievanceId);
  if (grievance) {
    const newComment = {
      id: grievance.comments.length + 1,
      author: currentUser.name,
      role: "Student",
      text: commentText,
      timestamp: new Date().toISOString(),
    };
    grievance.comments.push(newComment);
    grievance.updatedAt = new Date().toISOString();
    return { success: true, message: 'Comment added successfully!' };
  }
  return { success: false, message: 'Grievance not found.' };
};

export const closeGrievance = (grievanceId, satisfactionRating) => {
  const grievance = grievances.find(g => g.id === grievanceId);
  if (grievance && grievance.status === "Resolved") {
    grievance.status = "Closed";
    grievance.satisfactionRating = satisfactionRating;
    grievance.updatedAt = new Date().toISOString();
    return { success: true, message: 'Grievance closed successfully!' };
  }
  return { success: false, message: 'Grievance must be resolved before closing.' };
};

export const addChatMessage = (text, isAi = false, citations = null) => {
  const newMessage = {
    id: chatMessages.length + 1,
    senderId: isAi ? 'AI' : currentUser.id,
    senderName: isAi ? 'Nexus AI Assistant' : currentUser.name,
    text,
    timestamp: new Date().toLocaleString('en-US'),
    isAiResponse: isAi,
    citations,
  };
  chatMessages.push(newMessage);
  return newMessage;
};

// Alumni Data
export const alumni = [
  {
    id: 'ALU001',
    name: 'Dr. Zainab Ahmed',
    email: 'zainab.ahmed@techcorp.com',
    graduationYear: 2018,
    degree: 'BS Computer Science',
    photoUrl: 'https://i.pravatar.cc/150?img=45',
    currentCompany: 'Microsoft',
    companyLogo: 'https://img.icons8.com/color/96/microsoft.png',
    position: 'Senior Software Engineer',
    location: 'Seattle, USA',
    linkedIn: 'https://linkedin.com/in/zainab-ahmed',
    achievements: ['Published 3 research papers', 'Speaker at Tech Summit 2024'],
    expertise: ['Cloud Computing', 'AI/ML', 'System Design'],
  },
  {
    id: 'ALU002',
    name: 'Muhammad Hassan',
    email: 'hassan@google.com',
    graduationYear: 2019,
    degree: 'BS Software Engineering',
    photoUrl: 'https://i.pravatar.cc/150?img=12',
    currentCompany: 'Google',
    companyLogo: 'https://img.icons8.com/color/96/google-logo.png',
    position: 'Product Manager',
    location: 'Mountain View, USA',
    linkedIn: 'https://linkedin.com/in/muhammad-hassan',
    achievements: ['Led 5+ product launches', 'Google Cloud Certified'],
    expertise: ['Product Management', 'Data Analytics', 'UX Research'],
  },
  {
    id: 'ALU003',
    name: 'Ayesha Malik',
    email: 'ayesha@amazon.com',
    graduationYear: 2017,
    degree: 'BS Information Technology',
    photoUrl: 'https://i.pravatar.cc/150?img=32',
    currentCompany: 'Amazon',
    companyLogo: 'https://img.icons8.com/color/96/amazon.png',
    position: 'Solutions Architect',
    location: 'Dubai, UAE',
    linkedIn: 'https://linkedin.com/in/ayesha-malik',
    achievements: ['AWS Certified Solutions Architect', 'Built scalable systems for 100M+ users'],
    expertise: ['Cloud Architecture', 'DevOps', 'Microservices'],
  },
  {
    id: 'ALU004',
    name: 'Ali Raza',
    email: 'ali@startup.io',
    graduationYear: 2020,
    degree: 'BS Computer Science',
    photoUrl: 'https://i.pravatar.cc/150?img=51',
    currentCompany: 'TechVenture (Founder)',
    companyLogo: 'https://img.icons8.com/color/96/rocket.png',
    position: 'CEO & Co-Founder',
    location: 'Karachi, Pakistan',
    linkedIn: 'https://linkedin.com/in/ali-raza',
    achievements: ['Raised $2M in funding', 'Forbes 30 Under 30'],
    expertise: ['Entrepreneurship', 'FinTech', 'Business Strategy'],
  },
  {
    id: 'ALU005',
    name: 'Sara Khan',
    email: 'sara@meta.com',
    graduationYear: 2016,
    degree: 'BS Information Technology',
    photoUrl: 'https://i.pravatar.cc/150?img=25',
    currentCompany: 'Meta (Facebook)',
    companyLogo: 'https://img.icons8.com/color/96/meta.png',
    position: 'Engineering Manager',
    location: 'London, UK',
    linkedIn: 'https://linkedin.com/in/sara-khan',
    achievements: ['Led team of 15 engineers', 'Meta Bootcamp Mentor'],
    expertise: ['Engineering Leadership', 'React', 'Mobile Development'],
  },
  {
    id: 'ALU006',
    name: 'Usman Tariq',
    email: 'usman@ibm.com',
    graduationYear: 2021,
    degree: 'BS Software Engineering',
    photoUrl: 'https://i.pravatar.cc/150?img=33',
    currentCompany: 'IBM',
    companyLogo: 'https://img.icons8.com/color/96/ibm.png',
    position: 'Data Scientist',
    location: 'Toronto, Canada',
    linkedIn: 'https://linkedin.com/in/usman-tariq',
    achievements: ['Published AI research', 'Kaggle Competitions Master'],
    expertise: ['Machine Learning', 'Deep Learning', 'NLP'],
  },
  {
    id: 'ALU007',
    name: 'Fatima Noor',
    email: 'fatima@oracle.com',
    graduationYear: 2019,
    degree: 'BS Computer Science',
    photoUrl: 'https://i.pravatar.cc/150?img=44',
    currentCompany: 'Oracle',
    companyLogo: 'https://img.icons8.com/color/96/oracle-logo.png',
    position: 'Database Architect',
    location: 'Singapore',
    linkedIn: 'https://linkedin.com/in/fatima-noor',
    achievements: ['Oracle Certified Master', 'Database performance optimization expert'],
    expertise: ['Database Design', 'SQL', 'Performance Tuning'],
  },
  {
    id: 'ALU008',
    name: 'Ahmed Siddiqui',
    email: 'ahmed@salesforce.com',
    graduationYear: 2018,
    degree: 'BS Information Technology',
    photoUrl: 'https://i.pravatar.cc/150?img=60',
    currentCompany: 'Salesforce',
    companyLogo: 'https://img.icons8.com/color/96/salesforce.png',
    position: 'Technical Lead',
    location: 'San Francisco, USA',
    linkedIn: 'https://linkedin.com/in/ahmed-siddiqui',
    achievements: ['15x Salesforce Certified', 'Community Speaker'],
    expertise: ['CRM', 'Apex', 'Lightning Web Components'],
  },
];

export const alumniEvents = [
  {
    id: 'EVT001',
    title: 'Annual Alumni Reunion 2026',
    description: 'Join us for our annual reunion! Network with fellow alumni, share experiences, and reconnect with your batch mates.',
    date: '2026-03-15',
    time: '06:00 PM',
    venue: 'University Main Auditorium',
    type: 'Reunion',
    capacity: 500,
    registered: 234,
    fee: 2000, // PKR
    organizer: 'Alumni Relations Office',
    coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600',
    features: ['Networking Dinner', 'Live Music', 'Photo Booth', 'Awards Ceremony'],
    speakers: ['Dr. Zainab Ahmed', 'Muhammad Hassan'],
    status: 'Upcoming',
  },
  {
    id: 'EVT002',
    title: 'Tech Career Fair 2026',
    description: 'Exclusive career fair featuring top tech companies. Get interview opportunities, resume reviews, and career guidance.',
    date: '2026-02-28',
    time: '10:00 AM',
    venue: 'Campus Expo Center',
    type: 'Career Fair',
    capacity: 300,
    registered: 178,
    fee: 0,
    organizer: 'Career Services',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    features: ['Company Booths', 'Mock Interviews', 'Resume Clinic', 'Panel Discussions'],
    speakers: ['Ayesha Malik', 'Ali Raza', 'Sara Khan'],
    status: 'Upcoming',
  },
  {
    id: 'EVT003',
    title: 'Entrepreneurship Workshop',
    description: 'Learn from successful alumni entrepreneurs. Discover how to start your own venture and navigate the startup ecosystem.',
    date: '2026-04-10',
    time: '02:00 PM',
    venue: 'Innovation Hub, Block C',
    type: 'Workshop',
    capacity: 100,
    registered: 67,
    fee: 500,
    organizer: 'Entrepreneurship Cell',
    coverImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600',
    features: ['Interactive Sessions', 'Networking', 'Pitch Practice', 'Mentorship'],
    speakers: ['Ali Raza'],
    status: 'Upcoming',
  },
  {
    id: 'EVT004',
    title: 'AI & Machine Learning Webinar',
    description: 'Virtual webinar on latest trends in AI/ML. Get insights from industry experts working at top tech companies.',
    date: '2026-02-20',
    time: '07:00 PM',
    venue: 'Online (Zoom)',
    type: 'Webinar',
    capacity: 1000,
    registered: 543,
    fee: 0,
    organizer: 'CS Department',
    coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600',
    features: ['Live Q&A', 'Recording Access', 'Certificate', 'Resource Materials'],
    speakers: ['Dr. Zainab Ahmed', 'Usman Tariq'],
    status: 'Upcoming',
  },
  {
    id: 'EVT005',
    title: 'Sports Gala 2025',
    description: 'Annual sports meet for alumni and students. Participate in cricket, football, badminton and more!',
    date: '2025-12-20',
    time: '08:00 AM',
    venue: 'University Sports Complex',
    type: 'Sports',
    capacity: 400,
    registered: 312,
    fee: 1000,
    organizer: 'Sports Department',
    coverImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600',
    features: ['Multiple Sports', 'Refreshments', 'Prizes', 'Team Building'],
    speakers: [],
    status: 'Completed',
  },
];

export const registerForEvent = (eventId) => {
  const event = alumniEvents.find(e => e.id === eventId);
  if (event && event.registered < event.capacity) {
    event.registered++;
    return { success: true, message: 'Successfully registered for the event!', event };
  }
  return { success: false, message: 'Event is full or not found.' };
};

export const connectWithAlumni = (alumniId) => {
  const alumnus = alumni.find(a => a.id === alumniId);
  if (alumnus) {
    // Simulate LinkedIn connection
    return { success: true, message: `Connection request sent to ${alumnus.name}!`, linkedIn: alumnus.linkedIn };
  }
  return { success: false, message: 'Alumni not found.' };
};
