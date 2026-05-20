import React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
} from '@mui/material';

/**
 * A high-fidelity Markdown renderer for Nexus AI.
 * Supports: Bold, Lists, Headers, and Structured Tables.
 */
const MarkdownRenderer = ({ text, fontSize = '0.875rem', color = 'inherit' }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedContent = [];
  let tableBuffer = [];
  let isInTable = false;

  const parseInline = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderTable = (rows, key) => (
    <TableContainer key={key} component={Paper} elevation={0} sx={{ 
      my: 1.5, 
      border: '1px solid', 
      borderColor: 'divider', 
      borderRadius: 2,
      overflow: 'hidden' 
    }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            {rows[0].map((cell, i) => (
              <TableCell key={i} sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1 }}>{parseInline(cell)}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.slice(1).map((row, i) => (
            <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              {row.map((cell, j) => (
                <TableCell key={j} sx={{ fontSize: '0.75rem', py: 0.75 }}>{parseInline(cell)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const flushTable = (index) => {
    if (tableBuffer.length > 0) {
      renderedContent.push(renderTable(tableBuffer, `table-${index}`));
      tableBuffer = [];
    }
    isInTable = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.includes('|')) {
      if (trimmed.includes('---')) return; // Skip separators
      isInTable = true;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableBuffer.push(cells);
    } else {
      if (isInTable) flushTable(index);

      if (trimmed.startsWith('###')) {
        renderedContent.push(
          <Typography key={index} variant="subtitle2" sx={{ mt: 2, mb: 0.5, fontWeight: 800, color: 'primary.main' }}>
            {parseInline(trimmed.replace('###', '').trim())}
          </Typography>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        renderedContent.push(
          <Box key={index} sx={{ display: 'flex', gap: 1, ml: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize, fontWeight: 700 }}>•</Typography>
            <Typography variant="body2" sx={{ fontSize, flex: 1, color }}>{parseInline(trimmed.slice(2).trim())}</Typography>
          </Box>
        );
      } else if (trimmed !== '') {
        renderedContent.push(
          <Typography key={index} variant="body2" sx={{ fontSize, mb: 1.5, color, lineHeight: 1.6 }}>
            {parseInline(line)}
          </Typography>
        );
      }
    }
  });

  if (isInTable) flushTable('final');

  return <Box sx={{ width: '100%' }}>{renderedContent}</Box>;
};

export default MarkdownRenderer;
