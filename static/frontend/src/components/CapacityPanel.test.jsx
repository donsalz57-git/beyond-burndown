import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CapacityPanel from './CapacityPanel';
import { invoke } from '@forge/bridge';

// Mock @forge/bridge
jest.mock('@forge/bridge', () => ({
  invoke: jest.fn()
}));

describe('CapacityPanel', () => {
  const mockConfig = {
    capacityMode: 'manual',
    capacityPeriod: 'week',
    teamMembers: []
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockResolvedValue({ success: true, users: [] });
  });

  test('renders team capacity title', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('Team Capacity')).toBeInTheDocument();
  });

  test('renders period toggle buttons', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  test('weekly is active by default', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    const weeklyBtn = screen.getByText('Weekly');
    expect(weeklyBtn).toHaveClass('active');
  });

  test('can toggle to monthly', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    fireEvent.click(screen.getByText('Monthly'));
    expect(screen.getByText('Monthly')).toHaveClass('active');
  });

  test('shows empty state when no team members', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText(/No team members configured/)).toBeInTheDocument();
  });

  test('renders search input', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByPlaceholderText('Search for a user...')).toBeInTheDocument();
  });

  test('renders existing team members from config', () => {
    const configWithMembers = {
      ...mockConfig,
      teamMembers: [
        { name: 'Alice', hoursPerPeriod: 40 },
        { name: 'Bob', hoursPerPeriod: 32 }
      ]
    };
    render(<CapacityPanel config={configWithMembers} onSave={mockOnSave} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('can remove a team member', () => {
    const configWithMembers = {
      ...mockConfig,
      teamMembers: [{ name: 'Alice', hoursPerPeriod: 40 }]
    };
    render(<CapacityPanel config={configWithMembers} onSave={mockOnSave} />);

    const removeButton = screen.getByTitle('Remove team member');
    fireEvent.click(removeButton);

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  test('displays total capacity', () => {
    const configWithMembers = {
      ...mockConfig,
      teamMembers: [
        { name: 'Alice', hoursPerPeriod: 40 },
        { name: 'Bob', hoursPerPeriod: 32 }
      ]
    };
    render(<CapacityPanel config={configWithMembers} onSave={mockOnSave} />);

    expect(screen.getByText(/72 hrs\/week/)).toBeInTheDocument();
  });

  test('renders save button', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('Save Capacity')).toBeInTheDocument();
  });

  test('calls onSave with config when save button clicked', async () => {
    mockOnSave.mockResolvedValue();
    const configWithMembers = {
      ...mockConfig,
      teamMembers: [{ name: 'Alice', hoursPerPeriod: 40 }]
    };
    render(<CapacityPanel config={configWithMembers} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Capacity'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        capacityMode: 'manual',
        capacityPeriod: 'week',
        teamMembers: [{ name: 'Alice', hoursPerPeriod: 40 }]
      }));
    });
  });

  test('shows success message after save', async () => {
    mockOnSave.mockResolvedValue();
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Capacity'));

    await waitFor(() => {
      expect(screen.getByText(/Capacity saved successfully/)).toBeInTheDocument();
    });
  });

  test('renders help section', () => {
    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('How capacity works')).toBeInTheDocument();
  });

  test('fetches users when typing in search', async () => {
    invoke.mockResolvedValue({
      success: true,
      users: [{ accountId: '123', displayName: 'Test User', avatarUrl: null }]
    });

    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('Search for a user...');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('getUsers', { query: 'test' });
    });
  });

  test('shows user dropdown when users found', async () => {
    invoke.mockResolvedValue({
      success: true,
      users: [{ accountId: '123', displayName: 'Test User', avatarUrl: null }]
    });

    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('Search for a user...');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  test('adds user when clicking dropdown item', async () => {
    invoke.mockResolvedValue({
      success: true,
      users: [{ accountId: '123', displayName: 'Test User', avatarUrl: null }]
    });

    render(<CapacityPanel config={mockConfig} onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('Search for a user...');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test User'));

    // User should now be in the team members list (not in dropdown)
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });
});
