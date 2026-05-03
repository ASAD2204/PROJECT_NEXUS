import React from 'react';
import { Chip } from '@mui/material';

/**
 * StatusBadge
 *
 * Small helper that normalizes various status strings into labelled chips
 * with consistent colors. Supports different `type` contexts (risk, payment,
 * assignment, attendance) so callers can pass raw status values and get a
 * presentable badge back.
 */
const StatusBadge = ({ status, type = 'default' }) => {
  // Map incoming status to label & color. Keep logic centralized so any
  // change to status wording only needs to be updated here.
  const getStatusConfig = () => {
    // Risk status
    if (type === 'risk') {
      switch (status?.toLowerCase()) {
        case 'green':
          return { label: 'Low Risk', color: 'success' };
        case 'yellow':
          return { label: 'Medium Risk', color: 'warning' };
        case 'red':
          return { label: 'High Risk', color: 'error' };
        default:
          return { label: status, color: 'default' };
      }
    }

    // Payment status
    if (type === 'payment') {
      switch (status?.toLowerCase()) {
        case 'paid':
          return { label: 'Paid', color: 'success' };
        case 'unpaid':
          return { label: 'Unpaid', color: 'warning' };
        case 'overdue':
          return { label: 'Overdue', color: 'error' };
        case 'partial':
          return { label: 'Partial', color: 'info' };
        default:
          return { label: status, color: 'default' };
      }
    }

    // Assignment status
    if (type === 'assignment') {
      switch (status?.toLowerCase()) {
        case 'pending':
          return { label: 'Pending', color: 'warning' };
        case 'submitted':
          return { label: 'Submitted', color: 'info' };
        case 'graded':
          return { label: 'Graded', color: 'success' };
        default:
          return { label: status, color: 'default' };
      }
    }

    // Attendance status
    if (type === 'attendance') {
      switch (status?.toLowerCase()) {
        case 'present':
          return { label: 'Present', color: 'success' };
        case 'absent':
          return { label: 'Absent', color: 'error' };
        case 'leave':
          return { label: 'Leave', color: 'info' };
        default:
          return { label: status, color: 'default' };
      }
    }

    // Default
    return { label: status, color: 'default' };
  };

  const { label, color } = getStatusConfig();

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      sx={{
        fontWeight: 600,
        borderRadius: '8px',
      }}
    />
  );
};

export default StatusBadge;
