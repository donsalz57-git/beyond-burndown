/**
 * Tests for ConfidenceIndicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfidenceIndicator from './ConfidenceIndicator';

describe('ConfidenceIndicator', () => {
  const createMockConfidence = (overrides = {}) => ({
    overallScore: 85,
    level: 'high',
    breakdown: {
      estimates: { count: 8, total: 10, percent: 80 },
      dates: { count: 9, total: 10, percent: 90 },
      assignees: { count: 9, total: 10, percent: 90 }
    },
    warnings: [],
    ...overrides
  });

  test('renders high confidence indicator', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence()} />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  test('renders medium confidence indicator', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence({
      overallScore: 65,
      level: 'medium'
    })} />);
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  test('renders low confidence indicator', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence({
      overallScore: 40,
      level: 'low'
    })} />);
    expect(screen.getByText(/low/i)).toBeInTheDocument();
  });

  test('handles null confidence gracefully', () => {
    const { container } = render(<ConfidenceIndicator confidence={null} />);
    // Should render empty or not crash
    expect(container).toBeDefined();
  });
});
