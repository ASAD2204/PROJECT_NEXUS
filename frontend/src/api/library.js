/**
 * Library API Service
 *
 * Calls: /library/* endpoints — books, issues, returns, reservations,
 *        QR codes, reports
 */

import { AssignmentTurnedIn, Bookmark, MenuBook, Warning } from '@mui/icons-material';
import client from './client';

const REPORT_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#607D8B'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
};

const normalizeBook = (book = {}) => {
  const totalCopies = toNumber(book.total_copies ?? book.totalCopies, 0);
  const availableCopies = toNumber(book.available_copies ?? book.availableCopies, 0);

  return {
    ...book,
    id: book.id ?? book.book_id,
    bookId: book.book_id ?? book.id,
    book_id: book.book_id ?? book.id,
    title: book.title ?? '',
    author: book.author ?? '',
    category: book.category ?? '',
    publisher: book.publisher ?? '',
    yearPublished: book.yearPublished ?? book.publication_year ?? '',
    publication_year: book.publication_year ?? book.yearPublished ?? null,
    pages: book.pages ?? null,
    coverImage: book.coverImage ?? book.cover_image ?? '',
    cover_image: book.cover_image ?? book.coverImage ?? '',
    description: book.description ?? '',
    language: book.language ?? 'English',
    totalCopies,
    total_copies: totalCopies,
    availableCopies,
    available_copies: availableCopies,
    shelfLocation: book.shelfLocation ?? book.shelf_location ?? '',
    shelf_location: book.shelf_location ?? book.shelfLocation ?? '',
    ratings: toNumber(book.ratings ?? book.rating, 0),
    reviews: toNumber(book.reviews ?? book.reviewsCount, 0),
  };
};

const normalizeIssue = (issue = {}) => {
  const book = issue.book ? normalizeBook(issue.book) : {};
  const issueDate = issue.issue_date ?? issue.issueDate ?? issue.issuedOn ?? '';
  const dueDate = issue.due_date ?? issue.dueDate ?? '';
  const returnDate = issue.return_date ?? issue.returnDate ?? '';
  const status = String(issue.status ?? '').toLowerCase();
  const studentRollNo = issue.student_roll_no ?? issue.studentRollNo ?? '';
  const studentLabel = studentRollNo ? `Roll ${studentRollNo}` : issue.student_id ? `Student ${issue.student_id}` : 'Student';
  const daysOverdue = dueDate && status === 'issued'
    ? Math.max(0, Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24)))
    : toNumber(issue.daysOverdue, 0);

  return {
    ...issue,
    id: issue.id ?? issue.issue_id,
    issueId: issue.issue_id ?? issue.id,
    studentId: issue.student_id ?? issue.studentId ?? '',
    studentRollNo,
    studentName: issue.student_name ?? issue.studentName ?? studentLabel,
    bookId: issue.book_id ?? issue.bookId ?? book.id ?? '',
    bookTitle: issue.book_title ?? issue.bookTitle ?? book.title ?? '',
    bookIsbn: issue.book_isbn ?? issue.bookIsbn ?? book.isbn ?? '',
    isbn: issue.book_isbn ?? issue.bookIsbn ?? book.isbn ?? '',
    issueDate,
    issuedOn: issue.issuedOn ?? issueDate,
    dueDate,
    returnDate,
    status,
    daysOverdue,
    book,
  };
};

const normalizeReservation = (reservation = {}) => {
  const book = reservation.book ? normalizeBook(reservation.book) : {};
  const reservedAt = reservation.reserved_at ?? reservation.reservedAt ?? '';
  const expiresAt = reservation.expires_at ?? reservation.expiresAt ?? '';
  const backendStatus = String(reservation.status ?? '').toLowerCase();
  const status = backendStatus === 'active' ? 'approved' : backendStatus;
  const studentRollNo = reservation.student_roll_no ?? reservation.studentRollNo ?? '';
  const studentLabel = studentRollNo ? `Roll ${studentRollNo}` : reservation.student_id ? `Student ${reservation.student_id}` : 'Student';
  const daysUntilExpiry = expiresAt ? Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return {
    ...reservation,
    id: reservation.id ?? reservation.reservation_id,
    reservationId: reservation.reservation_id ?? reservation.id,
    studentId: reservation.student_id ?? reservation.studentId ?? '',
    studentRollNo,
    studentName: reservation.student_name ?? reservation.studentName ?? studentLabel,
    bookId: reservation.book_id ?? reservation.bookId ?? book.id ?? '',
    bookTitle: reservation.book_title ?? reservation.bookTitle ?? book.title ?? '',
    bookIsbn: reservation.book_isbn ?? reservation.bookIsbn ?? book.isbn ?? '',
    reservationDate: reservedAt,
    reservedAt,
    expectedAvailability: expiresAt,
    expiresAt,
    priority: daysUntilExpiry <= 1 ? 'high' : daysUntilExpiry <= 2 ? 'medium' : 'low',
    status,
    book,
  };
};

const normalizeLibrarianProfile = (profile = {}) => ({
  ...profile,
  librarianProfileId: profile.librarian_profile_id ?? profile.librarianProfileId ?? profile.id,
  librarian_profile_id: profile.librarian_profile_id ?? profile.librarianProfileId ?? profile.id,
  employeeId: profile.employee_code ?? profile.employeeCode ?? '',
  employee_code: profile.employee_code ?? profile.employeeCode ?? '',
  shift: profile.shift ?? '',
  assignedSection: profile.assigned_section ?? profile.assignedSection ?? '',
  assigned_section: profile.assigned_section ?? profile.assignedSection ?? '',
  joiningDate: profile.joining_date ?? profile.joiningDate ?? '',
  joining_date: profile.joining_date ?? profile.joiningDate ?? '',
  experience: profile.experience ?? '',
  qualification: profile.qualification ?? '',
  workingHours: profile.working_hours ?? profile.workingHours ?? '',
  working_hours: profile.working_hours ?? profile.workingHours ?? '',
  emergencyContact: profile.emergency_contact ?? profile.emergencyContact ?? '',
  emergency_contact: profile.emergency_contact ?? profile.emergencyContact ?? '',
  profileImageId: profile.profile_image_id ?? profile.profileImageId ?? '',
  profile_image_id: profile.profile_image_id ?? profile.profileImageId ?? '',
});

const mapLibrarianProfilePayload = (data = {}) => ({
  employee_code: data.employee_code ?? data.employeeId ?? null,
  shift: data.shift ?? null,
  assigned_section: data.assigned_section ?? data.assignedSection ?? null,
  joining_date: data.joining_date ?? data.joiningDate ?? null,
  experience: data.experience ?? null,
  qualification: data.qualification ?? null,
  working_hours: data.working_hours ?? data.workingHours ?? null,
  emergency_contact: data.emergency_contact ?? data.emergencyContact ?? null,
  profile_image_id: data.profile_image_id ?? data.profileImageId ?? null,
});

const normalizeReportPayload = async (reportResponse) => {
  const raw = reportResponse?.data ?? {};
  const booksResponse = await client.get('/library/books');
  const booksRaw = booksResponse.data?.books || booksResponse.data || [];
  const books = Array.isArray(booksRaw) ? booksRaw.map(normalizeBook) : [];
  const bookMap = new Map(books.map((book) => [String(book.id ?? book.bookId), book]));
  const recentTransactionsRaw = Array.isArray(raw.recent_transactions) ? raw.recent_transactions : [];
  const recentTransactions = recentTransactionsRaw.map((transaction) => {
    const relatedBook = bookMap.get(String(transaction.book_id)) || {};
    return {
      issueId: transaction.issue_id,
      studentId: transaction.student_id,
      bookId: transaction.book_id,
      bookTitle: relatedBook.title || `Book #${transaction.book_id}`,
      author: relatedBook.author || '',
      category: relatedBook.category || 'Uncategorized',
      status: String(transaction.status ?? '').toLowerCase(),
      issueDate: transaction.issue_date,
      dueDate: transaction.due_date,
    };
  });

  const stats = [
    {
      title: 'Total Books',
      value: String(raw.total_books ?? 0),
      subtitle: 'Copies in catalog',
      color: 'primary',
      icon: MenuBook,
      tooltip: 'Total number of physical book copies available in the library catalog',
    },
    {
      title: 'Issued',
      value: String(raw.total_issued ?? 0),
      subtitle: 'Active issues',
      color: 'success',
      icon: AssignmentTurnedIn,
      tooltip: 'Books currently issued to students and waiting for return',
    },
    {
      title: 'Overdue',
      value: String(raw.total_overdue ?? 0),
      subtitle: 'Need attention',
      color: 'warning',
      icon: Warning,
      tooltip: 'Books that have passed their due date and may incur fines',
    },
    {
      title: 'Reservations',
      value: String(raw.total_reservations ?? 0),
      subtitle: 'Active holds',
      color: 'info',
      icon: Bookmark,
      tooltip: 'Active book reservations waiting to be fulfilled',
    },
  ];

  const categoryData = Object.entries(raw.books_by_category || {}).map(([name, value], index) => ({
    name,
    value: toNumber(value, 0),
    color: REPORT_COLORS[index % REPORT_COLORS.length],
  }));

  const circulationMap = new Map();
  recentTransactions.forEach((transaction) => {
    const key = transaction.issueDate || 'Unknown';
    const current = circulationMap.get(key) || { month: key, issued: 0, returned: 0, reserved: 0 };
    if (transaction.status === 'returned') {
      current.returned += 1;
    } else if (transaction.status === 'issued') {
      current.issued += 1;
    } else {
      current.reserved += 1;
    }
    circulationMap.set(key, current);
  });
  const circulationData = Array.from(circulationMap.values()).slice(-6);

  const topBookMap = new Map();
  recentTransactions.forEach((transaction) => {
    const key = String(transaction.bookId);
    const current = topBookMap.get(key) || {
      title: transaction.bookTitle,
      author: transaction.author,
      category: transaction.category,
      borrows: 0,
    };
    current.borrows += 1;
    topBookMap.set(key, current);
  });
  const topBooks = Array.from(topBookMap.values())
    .sort((a, b) => b.borrows - a.borrows)
    .slice(0, 5);

  const uniqueBorrowers = new Set(recentTransactions.map((transaction) => transaction.studentId).filter(Boolean)).size;
  const memberTotalBase = Math.max(uniqueBorrowers + (raw.total_issued ?? 0) + (raw.total_reservations ?? 0), 1);
  const memberData = [
    {
      type: 'Unique Borrowers',
      count: uniqueBorrowers,
      percentage: Math.round((uniqueBorrowers / memberTotalBase) * 100),
    },
    {
      type: 'Active Issues',
      count: Number(raw.total_issued ?? 0),
      percentage: Math.round(((raw.total_issued ?? 0) / memberTotalBase) * 100),
    },
    {
      type: 'Reservations',
      count: Number(raw.total_reservations ?? 0),
      percentage: Math.round(((raw.total_reservations ?? 0) / memberTotalBase) * 100),
    },
  ];

  const todayActivity = recentTransactions.slice(0, 10).map((transaction) => ({
    action: transaction.status === 'returned' ? 'Returned' : 'Issued',
    bookTitle: transaction.bookTitle,
    student: transaction.studentId ? `Student ${transaction.studentId}` : 'Student',
    time: toDateString(transaction.issueDate),
  }));

  return {
    ...raw,
    stats,
    categoryData,
    category_data: categoryData,
    circulationData,
    circulation_data: circulationData,
    topBooks,
    top_books: topBooks,
    memberData,
    member_data: memberData,
    recent_transactions: recentTransactions,
    recentTransactions,
    today_activity: todayActivity,
    todayActivity,
  };
};

const mapBookPayload = (data = {}) => ({
  isbn: data.isbn ?? '',
  title: data.title ?? '',
  author: data.author ?? '',
  category: data.category ?? null,
  publisher: data.publisher ?? null,
  publication_year: data.publication_year ?? data.yearPublished ?? null,
  pages: data.pages ?? null,
  cover_image: data.cover_image ?? data.coverImage ?? null,
  description: data.description ?? null,
  language: data.language ?? 'English',
  total_copies: toNumber(data.total_copies ?? data.totalCopies, 0),
  available_copies: (() => {
    const availableCopiesInput = data.available_copies ?? data.availableCopies;
    if (availableCopiesInput === undefined || availableCopiesInput === '') {
      return undefined;
    }
    return toNumber(availableCopiesInput, 0);
  })(),
  shelf_location: data.shelf_location ?? data.shelfLocation ?? null,
});

const mapReservationStatus = (status) => {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'active' || normalized === 'pending') {
    return 'Active';
  }
  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'Cancelled';
  }
  if (normalized === 'fulfilled') {
    return 'Fulfilled';
  }
  if (normalized === 'expired') {
    return 'Expired';
  }
  return status;
};

const normalizeBooksResponse = (response) => {
  const raw = response?.data ?? [];
  const rows = Array.isArray(raw) ? raw : raw.books || [];
  const books = rows.map(normalizeBook);
  return Array.isArray(raw)
    ? { ...response, data: books }
    : { ...response, data: { ...raw, books } };
};

const normalizeIssuesResponse = (response) => {
  const raw = response?.data ?? [];
  const rows = Array.isArray(raw) ? raw : raw.issues || [];
  const issues = rows.map(normalizeIssue);
  return Array.isArray(raw)
    ? { ...response, data: issues }
    : { ...response, data: { ...raw, issues } };
};

const normalizeReservationsResponse = (response) => {
  const raw = response?.data ?? [];
  const rows = Array.isArray(raw) ? raw : raw.reservations || [];
  const reservations = rows.map(normalizeReservation);
  return Array.isArray(raw)
    ? { ...response, data: reservations }
    : { ...response, data: { ...raw, reservations } };
};

export const libraryAPI = {
  // ── Books ──
  searchBooks: async (params) => normalizeBooksResponse(await client.get('/library/books', { params })),
  getBook: async (id) => {
    const response = await client.get(`/library/books/${id}`);
    return { ...response, data: normalizeBook(response.data || {}) };
  },
  addBook: (data) => client.post('/library/books', mapBookPayload(data)),
  updateBook: (id, data) => client.put(`/library/books/${id}`, mapBookPayload(data)),
  deleteBook: (id) => client.delete(`/library/books/${id}`),

  // ── Issues / Returns ──
  issueBook: async (data) => {
    const payload = {
      student_id: data.student_id ?? data.studentId,
      book_id: data.book_id ?? data.bookId,
    };

    if (!payload.book_id && data.isbn) {
      const booksResponse = await client.get('/library/books', { params: { isbn: data.isbn } });
      const booksRaw = booksResponse.data?.books || booksResponse.data || [];
      const books = Array.isArray(booksRaw) ? booksRaw.map(normalizeBook) : [];
      payload.book_id = books[0]?.id ?? books[0]?.bookId;
    }

    return client.post('/library/issues', payload);
  },
  returnBook: (issueId, payload = {}) => client.post(`/library/returns/${issueId}`, payload),
  getIssues: async (params) => normalizeIssuesResponse(await client.get('/library/issues', { params })),
  getMyIssues: async () => {
    try {
      return normalizeIssuesResponse(await client.get('/library/issues/me'));
    } catch (error) {
      if (error?.response?.status === 404) {
        return normalizeIssuesResponse(await client.get('/library/issues'));
      }
      throw error;
    }
  },

  // ── QR Code ──
  getQRCode: (studentId) => client.get(`/library/qr/${studentId}`, { responseType: 'blob' }),

  // ── Reservations ──
  reserveBook: (data) => client.post('/library/reservations', {
    student_id: data.student_id ?? data.studentId,
    book_id: data.book_id ?? data.bookId,
  }),
  getReservations: async () => normalizeReservationsResponse(await client.get('/library/reservations')),
  getMyReservations: async () => normalizeReservationsResponse(await client.get('/library/reservations/me')),
  updateReservationStatus: (id, data) => client.put(`/library/reservations/${id}`, {
    status: mapReservationStatus(data?.status),
  }),
  cancelReservation: (id) => client.delete(`/library/reservations/${id}`),

  // ── Librarian Profile ──
  getProfile: async () => {
    const response = await client.get('/library/profile');
    return { ...response, data: normalizeLibrarianProfile(response.data || {}) };
  },
  updateProfile: (data) => client.put('/library/profile', mapLibrarianProfilePayload(data)),

  // ── Reports ──
  getReports: async () => {
    const response = await client.get('/library/reports');
    return { ...response, data: await normalizeReportPayload(response) };
  },
};

export default libraryAPI;
