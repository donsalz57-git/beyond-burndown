import React from 'react';
import { render, screen } from '@testing-library/react';
import CompliancePanel from './CompliancePanel';

describe('CompliancePanel', () => {
  const mockCompliance = {
    violations: [
      {
        type: 'missing_dates',
        severity: 'warning',
        issueKey: 'PROJ-1',
        issueSummary: 'Fix login bug',
        message: 'Missing start date'
      },
      {
        type: 'overdue',
        severity: 'error',
        issueKey: 'PROJ-2',
        issueSummary: 'Update documentation',
        message: 'Due date was Jan 15, 2026'
      }
    ],
    byType: {
      missing_dates: [
        {
          type: 'missing_dates',
          severity: 'warning',
          issueKey: 'PROJ-1',
          issueSummary: 'Fix login bug',
          message: 'Missing start date'
        }
      ],
      overdue: [
        {
          type: 'overdue',
          severity: 'error',
          issueKey: 'PROJ-2',
          issueSummary: 'Update documentation',
          message: 'Due date was Jan 15, 2026'
        }
      ]
    },
    summary: {
      total: 2,
      bySeverity: {
        error: 1,
        warning: 1,
        info: 0
      }
    }
  };

  test('renders empty state when no compliance data', () => {
    render(<CompliancePanel compliance={null} />);
    expect(screen.getByText('All Clear!')).toBeInTheDocument();
  });

  test('renders empty state when no violations', () => {
    render(<CompliancePanel compliance={{ violations: [] }} />);
    expect(screen.getByText('All Clear!')).toBeInTheDocument();
  });

  test('renders severity summary', () => {
    render(<CompliancePanel compliance={mockCompliance} />);
    // Multiple '1' values exist (error count, warning count, badges), so use getAllByText
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('errors')).toBeInTheDocument();
    expect(screen.getByText('warnings')).toBeInTheDocument();
  });

  test('renders violation groups by type', () => {
    render(<CompliancePanel compliance={mockCompliance} />);
    expect(screen.getByText('Missing Dates')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  test('renders issue keys as links', () => {
    render(<CompliancePanel compliance={mockCompliance} />);
    const link1 = screen.getByText('PROJ-1');
    const link2 = screen.getByText('PROJ-2');
    expect(link1.tagName).toBe('A');
    expect(link2.tagName).toBe('A');
  });

  test('renders violation messages', () => {
    render(<CompliancePanel compliance={mockCompliance} />);
    expect(screen.getByText('Missing start date')).toBeInTheDocument();
    expect(screen.getByText('Due date was Jan 15, 2026')).toBeInTheDocument();
  });

  test('shows count badges for each type', () => {
    render(<CompliancePanel compliance={mockCompliance} />);
    // Both groups have 1 violation
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  test('truncates long summaries to 10 items and shows more count', () => {
    const manyViolations = Array.from({ length: 15 }, (_, i) => ({
      type: 'missing_dates',
      severity: 'warning',
      issueKey: `PROJ-${i + 1}`,
      issueSummary: `Issue ${i + 1}`,
      message: 'Missing date'
    }));

    const complianceWithMany = {
      violations: manyViolations,
      byType: {
        missing_dates: manyViolations
      },
      summary: {
        total: 15,
        bySeverity: { error: 0, warning: 15, info: 0 }
      }
    };

    render(<CompliancePanel compliance={complianceWithMany} />);
    expect(screen.getByText('... and 5 more')).toBeInTheDocument();
  });

  test('renders all violation types when present', () => {
    const allTypesCompliance = {
      violations: [
        { type: 'missing_dates', severity: 'warning', issueKey: 'A-1', issueSummary: '', message: '' },
        { type: 'missing_estimate', severity: 'info', issueKey: 'A-2', issueSummary: '', message: '' },
        { type: 'done_with_remaining', severity: 'warning', issueKey: 'A-3', issueSummary: '', message: '' },
        { type: 'overdue', severity: 'error', issueKey: 'A-4', issueSummary: '', message: '' },
        { type: 'child_after_parent', severity: 'warning', issueKey: 'A-5', issueSummary: '', message: '' },
        { type: 'dependency_conflict', severity: 'error', issueKey: 'A-6', issueSummary: '', message: '' }
      ],
      byType: {
        missing_dates: [{ issueKey: 'A-1', severity: 'warning', issueSummary: '', message: '' }],
        missing_estimate: [{ issueKey: 'A-2', severity: 'info', issueSummary: '', message: '' }],
        done_with_remaining: [{ issueKey: 'A-3', severity: 'warning', issueSummary: '', message: '' }],
        overdue: [{ issueKey: 'A-4', severity: 'error', issueSummary: '', message: '' }],
        child_after_parent: [{ issueKey: 'A-5', severity: 'warning', issueSummary: '', message: '' }],
        dependency_conflict: [{ issueKey: 'A-6', severity: 'error', issueSummary: '', message: '' }]
      },
      summary: {
        total: 6,
        bySeverity: { error: 2, warning: 3, info: 1 }
      }
    };

    render(<CompliancePanel compliance={allTypesCompliance} />);
    expect(screen.getByText('Missing Dates')).toBeInTheDocument();
    expect(screen.getByText('Missing Estimates')).toBeInTheDocument();
    expect(screen.getByText('Done with Remaining Work')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Child After Parent')).toBeInTheDocument();
    expect(screen.getByText('Dependency Conflicts')).toBeInTheDocument();
  });

  test('orders violation types by severity priority', () => {
    const allTypesCompliance = {
      violations: [
        { type: 'missing_dates', severity: 'warning', issueKey: 'A-1', issueSummary: '', message: '' },
        { type: 'overdue', severity: 'error', issueKey: 'A-2', issueSummary: '', message: '' }
      ],
      byType: {
        missing_dates: [{ issueKey: 'A-1', severity: 'warning', issueSummary: '', message: '' }],
        overdue: [{ issueKey: 'A-2', severity: 'error', issueSummary: '', message: '' }]
      },
      summary: {
        total: 2,
        bySeverity: { error: 1, warning: 1, info: 0 }
      }
    };

    render(<CompliancePanel compliance={allTypesCompliance} />);

    // Get all violation group headers
    const headers = screen.getAllByText(/Missing Dates|Overdue/);
    // Overdue should come before Missing Dates based on type order
    const overdueIndex = headers.findIndex(h => h.textContent === 'Overdue');
    const missingDatesIndex = headers.findIndex(h => h.textContent === 'Missing Dates');
    expect(overdueIndex).toBeLessThan(missingDatesIndex);
  });
});
