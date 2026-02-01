/**
 * Tests for ExportMenu component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportMenu from './ExportMenu';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

describe('ExportMenu', () => {
  const createMockReport = () => ({
    generatedAt: '2024-02-01T10:00:00Z',
    headline: {
      feasibility: { score: 82, status: 'green' },
      forecast: { extraDays: 0, status: 'on_track', message: 'On track' },
      capacityUtilization: { percent: 85, status: 'green' },
      completion: { percent: 45, status: 'info' }
    },
    schedule: { deadline: '2024-02-28T00:00:00Z', bufferLabel: 'On time' },
    capacity: { available: 100, demand: 85, gap: -15 },
    progress: { closedCount: 10, remainingCount: 12 },
    risks: {
      overloadedPeriods: { count: 1 },
      complianceViolations: { count: 3 },
      circularDependencies: { count: 0 },
      overdueIssues: { count: 2 }
    },
    decisions: [],
    confidence: { overallScore: 85, level: 'high' }
  });

  test('renders export button', () => {
    render(<ExportMenu report={createMockReport()} />);

    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  test('shows dropdown menu on click', () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));

    expect(screen.getByText(/copy as text/i)).toBeInTheDocument();
    expect(screen.getByText(/copy as markdown/i)).toBeInTheDocument();
    expect(screen.getByText(/download/i)).toBeInTheDocument();
  });

  test('copies text to clipboard', async () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    fireEvent.click(screen.getByText(/copy as text/i));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('copies markdown to clipboard', async () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    fireEvent.click(screen.getByText(/copy as markdown/i));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const lastCall = navigator.clipboard.writeText.mock.calls[navigator.clipboard.writeText.mock.calls.length - 1][0];
    expect(lastCall).toContain('#'); // Markdown headers
  });

  test('closes dropdown after selection', () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    expect(screen.getByText(/copy as text/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/copy as text/i));

    // Dropdown should close
    expect(screen.queryByText(/copy as text/i)).not.toBeInTheDocument();
  });

  test('closes dropdown on outside click', () => {
    const { container } = render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    expect(screen.getByText(/copy as text/i)).toBeInTheDocument();

    fireEvent.mouseDown(container);

    expect(screen.queryByText(/copy as text/i)).not.toBeInTheDocument();
  });

  test('handles null report', () => {
    render(<ExportMenu report={null} />);

    const button = screen.getByText(/export/i);
    expect(button).toBeDisabled();
  });

  test('generated text includes key metrics', async () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    fireEvent.click(screen.getByText(/copy as text/i));

    const textContent = navigator.clipboard.writeText.mock.calls[navigator.clipboard.writeText.mock.calls.length - 1][0];
    expect(textContent).toContain('82%'); // feasibility score
    expect(textContent).toContain('85%'); // utilization
  });

  test('generated markdown is valid', async () => {
    render(<ExportMenu report={createMockReport()} />);

    fireEvent.click(screen.getByText(/export/i));
    fireEvent.click(screen.getByText(/copy as markdown/i));

    const mdContent = navigator.clipboard.writeText.mock.calls[navigator.clipboard.writeText.mock.calls.length - 1][0];
    expect(mdContent).toMatch(/^#/m); // Has headers
    expect(mdContent).toContain('**'); // Has bold text
  });
});
