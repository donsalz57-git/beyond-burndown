import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfigPanel from './ConfigPanel';

describe('ConfigPanel', () => {
  const mockConfig = {
    demandJql: 'project = TEST',
    capacityMode: 'manual',
    capacityPeriod: 'week',
    teamMembers: []
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders settings title', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('renders demand JQL field', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByLabelText('Demand JQL Query')).toBeInTheDocument();
  });

  test('renders capacity tab note', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText(/Use the Capacity tab/)).toBeInTheDocument();
  });

  test('populates fields from config prop', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByLabelText('Demand JQL Query')).toHaveValue('project = TEST');
  });

  test('uses default values when config is null', () => {
    render(<ConfigPanel config={null} onSave={mockOnSave} />);
    const demandField = screen.getByLabelText('Demand JQL Query');
    expect(demandField.value).toContain('project = DEV');
  });

  test('renders save button', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('Save Configuration')).toBeInTheDocument();
  });

  test('renders cancel button when onCancel provided', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('does not render cancel button when onCancel not provided', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  test('updates demand JQL on input change', async () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    const demandField = screen.getByLabelText('Demand JQL Query');

    fireEvent.change(demandField, { target: { value: 'project = NEW' } });

    expect(demandField).toHaveValue('project = NEW');
  });

  test('calls onSave with form data when save button clicked', async () => {
    mockOnSave.mockResolvedValue();
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        demandJql: 'project = TEST'
      }));
    });
  });

  test('calls onCancel when cancel button clicked', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('shows saving state while save is in progress', async () => {
    let resolvePromise;
    mockOnSave.mockImplementation(() => new Promise(resolve => {
      resolvePromise = resolve;
    }));

    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    resolvePromise();
    await waitFor(() => {
      expect(screen.getByText('Save Configuration')).toBeInTheDocument();
    });
  });

  test('shows success message after successful save', async () => {
    mockOnSave.mockResolvedValue();
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration saved successfully')).toBeInTheDocument();
    });
  });

  test('disables buttons while saving', async () => {
    let resolvePromise;
    mockOnSave.mockImplementation(() => new Promise(resolve => {
      resolvePromise = resolve;
    }));

    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} onCancel={mockOnCancel} />);

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    expect(screen.getByText('Saving...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();

    resolvePromise();
    await waitFor(() => {
      expect(screen.getByText('Save Configuration')).not.toBeDisabled();
    });
  });

  test('renders help section', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
  });

  test('renders help text for demand field', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText(/JQL query to fetch demand issues/)).toBeInTheDocument();
  });

  test('renders help text about capacity tab', () => {
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);
    expect(screen.getByText(/is configured in the Capacity tab/)).toBeInTheDocument();
  });

  test('clears success message when input changes after save', async () => {
    mockOnSave.mockResolvedValue();
    render(<ConfigPanel config={mockConfig} onSave={mockOnSave} />);

    // Save first
    fireEvent.click(screen.getByText('Save Configuration'));
    await waitFor(() => {
      expect(screen.getByText('Configuration saved successfully')).toBeInTheDocument();
    });

    // Change input
    fireEvent.change(screen.getByLabelText('Demand JQL Query'), { target: { value: 'changed' } });

    // Success message should be gone
    expect(screen.queryByText('Configuration saved successfully')).not.toBeInTheDocument();
  });

  test('preserves existing capacity config when saving', async () => {
    mockOnSave.mockResolvedValue();
    const configWithCapacity = {
      ...mockConfig,
      teamMembers: [{ name: 'Alice', hoursPerPeriod: 40 }]
    };
    render(<ConfigPanel config={configWithCapacity} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Save Configuration'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
        teamMembers: [{ name: 'Alice', hoursPerPeriod: 40 }]
      }));
    });
  });
});
