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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../../api/attendance';
import PageHeader from '../../components/Common/PageHeader';
import StatusBadge from '../../components/Common/StatusBadge';
import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';
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
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/attendance')}
          >
            Mark Attendance
          </Button>
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
