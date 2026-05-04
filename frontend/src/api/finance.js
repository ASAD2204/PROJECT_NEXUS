/**
 * Finance API Service
 * 
 * Calls: /finance/* endpoints — fee heads, invoices, payments, fines
 */

import client from './client';

export const financeAPI = {
  // ── Fee Heads ──
  getFeeHeads: () => client.get('/finance/fee-heads'),
  createFeeHead: (data) => client.post('/finance/fee-heads', data),
  updateFeeHead: (id, data) => client.put(`/finance/fee-heads/${id}`, data),
  deleteFeeHead: (id) => client.delete(`/finance/fee-heads/${id}`),

  // ── Invoices ──
  getMyInvoices: () => client.get('/finance/invoices/me'),
  getInvoices: (params) => client.get('/finance/invoices', { params }),
  getInvoice: (id) => client.get(`/finance/invoices/${id}`),
  createInvoice: (data) => client.post('/finance/invoices', data),
  generateInvoices: (data) => client.post('/finance/invoices/generate', data),
  updateInvoice: (id, data) => client.put(`/finance/invoices/${id}`, data),
  deleteInvoice: (id) => client.delete(`/finance/invoices/${id}`),
  downloadInvoicePDF: (id) => client.get(`/finance/invoices/${id}/pdf`, { responseType: 'blob' }),

  // ── Payments ──
  payInvoice: (invoiceId, paymentMethod) =>
    client.post(`/finance/payments/${invoiceId}`, { payment_method: paymentMethod }),
  getPayments: (params) => client.get('/finance/payments', { params }),
  getLedger: (params) => client.get('/finance/ledger', { params }),
  sendPaymentReminder: (studentId, amount) =>
    client.post(`/finance/reminders`, { student_id: studentId, amount }),

  // ── Fines ──
  getFines: (params) => client.get('/finance/fines', { params }),
  getMyFines: () => client.get('/finance/fines/me'),
  updateFines: (id, data) => client.put(`/finance/fines/${id}`, data),
  exportLedger: () => client.get('/finance/ledger/export', { responseType: 'blob' }),

  // ── Fee Structure ──
  getFeeStructure: (params) => client.get('/finance/fee-structure', { params }),
  createFeeStructure: (data) => client.post('/finance/fee-structure', data),
  deleteFeeStructure: (id) => client.delete(`/finance/fee-structure/${id}`),
};

export default financeAPI;
