import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../../api/attendance';
import PageHeader from '../../components/Common/PageHeader';
import StatusBadge from '../../components/Common/StatusBadge';
import { Button } from '@mui/material';
import { Add, FileDownload } from '@mui/icons-material';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';
import { pageTransition } from '../../utils/animations';

const AttendanceHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await attendanceAPI.getMyHistory();
        setAttendance(res.data?.records || res.data || []);
      } catch { /* empty */ }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const getCourseName = (courseId) => {
    return courseId; // Course name can be embedded in record from API
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Attendance History"
          subtitle="Loading your attendance records..."
        />
        <TableSkeleton rows={10} />
      </Box>
    );
  }

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      <PageHeader
        title="Attendance History"
        subtitle="View your complete attendance record"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={() => {
                const headers = ['Date', 'Course', 'Status', 'Check-in Time', 'Location'];
                const rows = attendance.map(r => [
                  new Date(r.date).toLocaleDateString(),
                  r.courseId,
                  r.status,
                  r.checkInTime || '-',
                  r.gpsLat && r.gpsLong ? `${r.gpsLat}, ${r.gpsLong}` : '-'
                ]);
                const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", "attendance_history.csv");
                document.body.appendChild(link);
                link.click();
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/attendance')}
            >
              Mark Attendance
            </Button>
          </Stack>
        }
      />

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Date</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Course</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Check-in Time</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Location</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{getCourseName(record.courseId)}</TableCell>
                    <TableCell align="center">
                      <StatusBadge status={record.status} type="attendance" />
                    </TableCell>
                    <TableCell>
                      {record.checkInTime || '-'}
                    </TableCell>
                    <TableCell>
                      {record.gpsLat && record.gpsLong
                        ? `${record.gpsLat.toFixed(4)}, ${record.gpsLong.toFixed(4)}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>    </motion.div>  );
};

export default AttendanceHistory;
