/**
 * Centralized Validation Utilities for Project Nexus
 *
 * All regex patterns and constraints are derived from the PostgreSQL
 * database schema (models.py) to keep frontend ↔ backend in sync.
 *
 * @module validation
 */

// ── Regex Patterns ──────────────────────────────────────────────────────────

/** Email — matches auth_users.email (String 255) */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Phone — digits, +, -, (), spaces; 7-20 chars — matches sis_students.phone / auth_users.phone (String 20) */
export const PHONE_REGEX = /^[0-9+\-() ]{7,20}$/;

/** CNIC — Pakistani national ID: 5 digits - 7 digits - 1 digit — matches sis_students.cnic (String 15) */
export const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

/** Name — letters, spaces, hyphens, dots, apostrophes (supports unicode accented chars) */
export const NAME_REGEX = /^[A-Za-z\u00C0-\u024F\s'.\-]+$/;

/** Roll number — alphanumeric + hyphens, 1-20 chars — matches sis_students.roll_no (String 20) */
export const ROLL_NO_REGEX = /^[A-Za-z0-9\-]+$/;

/** URL — basic URL format */
export const URL_REGEX = /^https?:\/\/.+/;

/** Employee code — alphanumeric + hyphens + slashes — matches sis_faculty.employee_code (String 20) */
export const EMPLOYEE_CODE_REGEX = /^[A-Za-z0-9\-/]+$/;

/** ISBN — digits, hyphens, X at end (ISBN-10 / ISBN-13) — matches lib_books.isbn (String 20) */
export const ISBN_REGEX = /^[\d\-X]+$/;

/** Password min length — consistent across auth-service */
export const PASSWORD_MIN_LENGTH = 8;

/** Alphanumeric + basic punctuation (for subjects, titles) */
export const TITLE_REGEX = /^[A-Za-z0-9\u00C0-\u024F\s'.,\-:;!?()&/]+$/;

/** Digits only — for card numbers (after stripping spaces), PINs, OTPs */
export const DIGITS_ONLY_REGEX = /^\d+$/;

/** Year — 4-digit number */
export const YEAR_REGEX = /^\d{4}$/;


// ── Input Filters (for onChange handlers) ───────────────────────────────────

/** Strips everything except digits and dashes (for CNIC) */
export const filterCNIC = (val) => val.replace(/[^\d-]/g, '').slice(0, 15);

/** Strips everything except digits, +, -, (, ), spaces (for phone) */
export const filterPhone = (val) => val.replace(/[^0-9+\-() ]/g, '').slice(0, 20);

/** Strips everything except digits (for OTP, PIN, card CVV) */
export const filterDigits = (val) => val.replace(/\D/g, '');

/** Strips everything except digits and spaces (for card numbers) */
export const filterCardNumber = (val) => val.replace(/[^\d ]/g, '').slice(0, 19);

/** Strips everything except digits and slash (for MM/YY expiry) */
export const filterExpiry = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
  return v;
};

/** Strips everything except letters, spaces, dots, hyphens, apostrophes (for names) */
export const filterName = (val) => val.replace(/[^A-Za-z\u00C0-\u024F\s'.\-]/g, '');

/** Strips everything except alphanumeric, hyphens (for roll numbers, codes) */
export const filterAlphanumericDash = (val) => val.replace(/[^A-Za-z0-9\-]/g, '');

/** Strips everything except alphanumeric, hyphens, slashes (for employee codes) */
export const filterEmployeeCode = (val) => val.replace(/[^A-Za-z0-9\-/]/g, '');

/** Strips everything except digits, hyphens, X (for ISBN) */
export const filterISBN = (val) => val.replace(/[^\dX\-]/g, '').slice(0, 20);

/** Keeps only digits (for year fields) */
export const filterYear = (val) => val.replace(/\D/g, '').slice(0, 4);


// ── Field Validators (return error string or '') ────────────────────────────

/**
 * Validates a field value and returns an error message or empty string.
 * @param {string} fieldType - the type of field being validated
 * @param {string} value - the value to validate
 * @param {object} [options] - optional constraints
 * @returns {string} error message or ''
 */
export const validateField = (fieldType, value, options = {}) => {
  const v = (value || '').trim();

  switch (fieldType) {
    case 'name':
      if (options.required && !v) return `${options.label || 'Name'} is required`;
      if (v && v.length < 2) return 'Must be at least 2 characters';
      if (v && !NAME_REGEX.test(v)) return 'Only letters, spaces, hyphens, and dots allowed';
      return '';

    case 'email':
      if (options.required && !v) return 'Email is required';
      if (v && !EMAIL_REGEX.test(v)) return 'Invalid email format (e.g. user@example.com)';
      return '';

    case 'phone':
      if (options.required && !v) return 'Phone number is required';
      if (v && !PHONE_REGEX.test(v)) return 'Only digits, +, -, (, ) allowed (7-20 chars)';
      return '';

    case 'cnic':
      if (options.required && !v) return 'CNIC is required';
      if (v && !CNIC_REGEX.test(v)) return 'Format: 12345-6789012-3';
      return '';

    case 'rollNo':
      if (options.required && !v) return 'Roll number is required';
      if (v && !ROLL_NO_REGEX.test(v)) return 'Only letters, digits, and hyphens allowed';
      return '';

    case 'url':
      if (options.required && !v) return 'URL is required';
      if (v && !URL_REGEX.test(v)) return 'Must start with http:// or https://';
      return '';

    case 'password':
      if (!v) return 'Password is required';
      if (v.length < PASSWORD_MIN_LENGTH) return `Must be at least ${PASSWORD_MIN_LENGTH} characters`;
      if (!/[A-Z]/.test(v)) return 'Must contain at least one uppercase letter';
      if (!/[a-z]/.test(v)) return 'Must contain at least one lowercase letter';
      if (!/\d/.test(v)) return 'Must contain at least one digit';
      return '';

    case 'isbn':
      if (options.required && !v) return 'ISBN is required';
      if (v && !ISBN_REGEX.test(v)) return 'Only digits, hyphens, and X allowed';
      return '';

    case 'year':
      if (options.required && !v) return 'Year is required';
      if (v && !YEAR_REGEX.test(v)) return 'Must be a 4-digit year';
      if (v) {
        const num = parseInt(v, 10);
        if (num < (options.min || 1950) || num > (options.max || 2100)) {
          return `Must be between ${options.min || 1950} and ${options.max || 2100}`;
        }
      }
      return '';

    case 'employeeCode':
      if (options.required && !v) return 'Employee code is required';
      if (v && !EMPLOYEE_CODE_REGEX.test(v)) return 'Only letters, digits, hyphens, and slashes allowed';
      return '';

    default:
      return '';
  }
};
