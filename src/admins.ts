// Admin allow-list, set per deployment via REACT_APP_ADMIN_EMAILS
// (comma-separated). Falls back to the original hardcoded pair so an
// environment without the variable keeps working.
const DEFAULT_ADMIN_EMAILS = ['jgireesa@gmail.com', 'dineshjagadam@gmail.com'];

export const ADMIN_EMAILS: string[] = (process.env.REACT_APP_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const adminEmails = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : DEFAULT_ADMIN_EMAILS;

export const isAdmin = (email?: string | null): boolean =>
  !!email && adminEmails.includes(email.toLowerCase());
