import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { CloudUpload, InsertDriveFile } from '@mui/icons-material';

/**
 * FileDropzone
 *
 * Simple drag-and-drop file picker used in forms. Keeps state minimal and
 * reports the selected file through `onFileSelect`. Validation performed is
 * limited to file size (MB) so callers can implement additional checks.
 *
 * Props:
 * - `onFileSelect(file)` callback when a file is chosen
 * - `acceptedTypes` string for the input `accept` attribute (defaults to '*')
 * - `maxSize` in MB (defaults to 10)
 */
const FileDropzone = ({ onFileSelect, acceptedTypes = '*', maxSize = 10 }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle drag enter/over/leave to provide visual feedback
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Drop handler reads the first file and delegates to handleFile
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // File input change handler (click-to-browse)
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Central file validation and callback
  const handleFile = (file) => {
    // Check file size (convert maxSize from MB to bytes)
    if (file.size > maxSize * 1024 * 1024) {
      // Keep UI simple; callers may prefer a custom error UX
      alert(`File size exceeds ${maxSize}MB limit`);
      return;
    }
    
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <Paper
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      sx={{
        border: dragActive ? '3px dashed #1976D2' : '2px dashed #ccc',
        borderRadius: '12px',
        padding: 4,
        textAlign: 'center',
        backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: '#1976D2',
          backgroundColor: 'rgba(25, 118, 210, 0.02)',
        },
      }}
    >
      {/* Hidden native file input paired with the label below */}
      <input
        type="file"
        id="file-upload"
        accept={acceptedTypes}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
        {selectedFile ? (
          <Box>
            <InsertDriveFile sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
            <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
              Click or drag to change file
            </Typography>
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop file here
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Maximum file size: {maxSize}MB
            </Typography>
          </Box>
        )}
      </label>
    </Paper>
  );
};

export default FileDropzone;
