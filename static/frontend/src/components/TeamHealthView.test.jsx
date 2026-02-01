/**
 * Tests for TeamHealthView component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamHealthView from './TeamHealthView';

describe('TeamHealthView', () => {
  const createMockResources = () => [
    {
      assignee: 'Alice',
      capacity: 40,
      demand: 35,
      timeSpent: 20,
      issueCount: 5,
      loadPercent: 88,
      utilizationPercent: 50,
      status: 'on_track'
    },
    {
      assignee: 'Bob',
      capacity: 40,
      demand: 50,
      timeSpent: 25,
      issueCount: 6,
      loadPercent: 125,
      utilizationPercent: 63,
      status: 'overloaded'
    }
  ];

  test('renders table with resource data', () => {
    render(<TeamHealthView resources={createMockResources()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('displays table headers', () => {
    render(<TeamHealthView resources={createMockResources()} />);
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Demand')).toBeInTheDocument();
  });

  test('handles empty resources array', () => {
    render(<TeamHealthView resources={[]} />);
    expect(screen.getByText(/no team data/i)).toBeInTheDocument();
  });

  test('handles null resources', () => {
    render(<TeamHealthView resources={null} />);
    expect(screen.getByText(/no team data/i)).toBeInTheDocument();
  });
});
