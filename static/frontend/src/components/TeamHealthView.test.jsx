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
    },
    {
      assignee: 'Carol',
      capacity: 40,
      demand: 20,
      timeSpent: 10,
      issueCount: 3,
      loadPercent: 50,
      utilizationPercent: 25,
      status: 'under_utilized'
    },
    {
      assignee: 'Unassigned',
      capacity: 0,
      demand: 15,
      timeSpent: 0,
      issueCount: 2,
      loadPercent: null,
      utilizationPercent: null,
      status: 'no_capacity'
    }
  ];

  test('renders table with resource data', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  test('displays capacity and demand values', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    // Check that capacity/demand are displayed
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  test('shows correct status badges', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    expect(screen.getByText('on_track')).toBeInTheDocument();
    expect(screen.getByText('overloaded')).toBeInTheDocument();
    expect(screen.getByText('under_utilized')).toBeInTheDocument();
  });

  test('displays load percentages', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('shows issue counts', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handles empty resources array', () => {
    render(<TeamHealthView resources={[]} />);

    expect(screen.getByText(/no resource data/i)).toBeInTheDocument();
  });

  test('handles null resources', () => {
    render(<TeamHealthView resources={null} />);

    expect(screen.getByText(/no resource data/i)).toBeInTheDocument();
  });

  test('applies correct CSS classes for status', () => {
    const { container } = render(<TeamHealthView resources={createMockResources()} />);

    expect(container.querySelector('.status-on_track')).toBeInTheDocument();
    expect(container.querySelector('.status-overloaded')).toBeInTheDocument();
    expect(container.querySelector('.status-under_utilized')).toBeInTheDocument();
  });

  test('displays table headers', () => {
    render(<TeamHealthView resources={createMockResources()} />);

    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Demand')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
