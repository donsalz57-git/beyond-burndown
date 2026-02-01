/**
 * Tests for ConfidenceIndicator component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('renders medium confidence indicator', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence({
      overallScore: 65,
      level: 'medium'
    })} />);

    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  test('renders low confidence indicator', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence({
      overallScore: 40,
      level: 'low'
    })} />);

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  test('shows tooltip on hover', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence()} />);

    const indicator = screen.getByText('High').closest('.confidence-indicator');
    fireEvent.mouseEnter(indicator);

    // Tooltip should show breakdown
    expect(screen.getByText(/Estimates:/)).toBeInTheDocument();
    expect(screen.getByText(/Dates:/)).toBeInTheDocument();
    expect(screen.getByText(/Assignees:/)).toBeInTheDocument();
  });

  test('displays warnings in tooltip', () => {
    render(<ConfidenceIndicator confidence={createMockConfidence({
      overallScore: 50,
      level: 'low',
      warnings: ['5 issues missing estimates', '3 issues unassigned']
    })} />);

    const indicator = screen.getByText('Low').closest('.confidence-indicator');
    fireEvent.mouseEnter(indicator);

    expect(screen.getByText(/5 issues missing estimates/)).toBeInTheDocument();
    expect(screen.getByText(/3 issues unassigned/)).toBeInTheDocument();
  });

  test('handles null confidence gracefully', () => {
    render(<ConfidenceIndicator confidence={null} />);

    // Should render nothing or a default state
    expect(screen.queryByText('High')).not.toBeInTheDocument();
    expect(screen.queryByText('Low')).not.toBeInTheDocument();
  });

  test('applies correct CSS class for confidence level', () => {
    const { rerender } = render(<ConfidenceIndicator confidence={createMockConfidence({ level: 'high' })} />);
    expect(screen.getByText('High').closest('.confidence-indicator')).toHaveClass('high');

    rerender(<ConfidenceIndicator confidence={createMockConfidence({ level: 'medium', overallScore: 65 })} />);
    expect(screen.getByText('Medium').closest('.confidence-indicator')).toHaveClass('medium');

    rerender(<ConfidenceIndicator confidence={createMockConfidence({ level: 'low', overallScore: 40 })} />);
    expect(screen.getByText('Low').closest('.confidence-indicator')).toHaveClass('low');
  });
});
