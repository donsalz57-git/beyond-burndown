/**
 * Tests for WhatIfPanel component
 * Updated for multi-scenario support with add/remove capacity and scope
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhatIfPanel from './WhatIfPanel';

describe('WhatIfPanel', () => {
  const createMockEnvelope = () => ({
    feasibilityScore: 75,
    totals: {
      totalCapacity: 100,
      totalDemand: 80,
      totalDays: 20
    },
    timeline: [
      { date: '2024-01-15', isOverloaded: false },
      { date: '2024-01-16', isOverloaded: false },
      { date: '2024-01-17', isOverloaded: false }
    ],
    forecast: {
      forecastDate: null,
      extraDays: 0,
      status: 'on_track'
    }
  });

  const defaultProps = {
    envelope: createMockEnvelope(),
    isOpen: true,
    onClose: jest.fn(),
    appliedScenarios: [],
    onUpdateScenarios: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('renders when open with envelope', () => {
      render(<WhatIfPanel {...defaultProps} />);
      expect(screen.getByText(/what-if scenarios/i)).toBeInTheDocument();
    });

    test('renders nothing when closed', () => {
      const { container } = render(<WhatIfPanel {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    test('renders nothing when envelope is null', () => {
      const { container } = render(<WhatIfPanel {...defaultProps} envelope={null} />);
      expect(container.firstChild).toBeNull();
    });

    test('renders scenario type tabs', () => {
      render(<WhatIfPanel {...defaultProps} />);
      expect(screen.getByText('Capacity')).toBeInTheDocument();
      expect(screen.getByText('Scope')).toBeInTheDocument();
      expect(screen.getByText('Deadline')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    test('calls onClose when clicked', () => {
      const onClose = jest.fn();
      render(<WhatIfPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('capacity scenarios', () => {
    test('shows add/remove capacity toggle', () => {
      render(<WhatIfPanel {...defaultProps} />);
      expect(screen.getByText('Add Capacity')).toBeInTheDocument();
      expect(screen.getByText('Remove Capacity')).toBeInTheDocument();
    });

    test('defaults to add capacity mode', () => {
      render(<WhatIfPanel {...defaultProps} />);
      const addButton = screen.getByText('Add Capacity');
      // Check it has the selected styling (green border)
      expect(addButton).toHaveStyle({ borderColor: '#00875A' });
    });

    test('can switch to remove capacity mode', () => {
      render(<WhatIfPanel {...defaultProps} />);
      const removeButton = screen.getByText('Remove Capacity');
      fireEvent.click(removeButton);
      expect(removeButton).toHaveStyle({ borderColor: '#DE350B' });
    });

    test('shows developer and hours inputs', () => {
      render(<WhatIfPanel {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    test('defaults hours per dev to 8', () => {
      render(<WhatIfPanel {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton');
      // Second input should be hours per dev
      expect(inputs[1]).toHaveValue(8);
    });
  });

  describe('scope scenarios', () => {
    test('shows scope options when scope tab clicked', () => {
      render(<WhatIfPanel {...defaultProps} />);

      const scopeTab = screen.getByText('Scope');
      fireEvent.click(scopeTab);

      expect(screen.getByText('Remove Scope')).toBeInTheDocument();
      expect(screen.getByText('Add Scope')).toBeInTheDocument();
    });

    test('defaults to remove scope mode', () => {
      render(<WhatIfPanel {...defaultProps} />);

      const scopeTab = screen.getByText('Scope');
      fireEvent.click(scopeTab);

      const removeButton = screen.getByText('Remove Scope');
      expect(removeButton).toHaveStyle({ borderColor: '#00875A' });
    });
  });

  describe('deadline scenarios', () => {
    test('shows date picker when deadline tab clicked', () => {
      render(<WhatIfPanel {...defaultProps} />);

      const deadlineTab = screen.getByText('Deadline');
      fireEvent.click(deadlineTab);

      expect(screen.getByText(/new deadline/i)).toBeInTheDocument();
    });
  });

  describe('adding scenarios', () => {
    test('calls onUpdateScenarios when Add button clicked', () => {
      const onUpdateScenarios = jest.fn();
      render(<WhatIfPanel {...defaultProps} onUpdateScenarios={onUpdateScenarios} />);

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      expect(onUpdateScenarios).toHaveBeenCalled();
      const scenarios = onUpdateScenarios.mock.calls[0][0];
      expect(scenarios.length).toBe(1);
      expect(scenarios[0].enabled).toBe(true);
    });

    test('scenario includes correct delta for add capacity', () => {
      const onUpdateScenarios = jest.fn();
      render(<WhatIfPanel {...defaultProps} onUpdateScenarios={onUpdateScenarios} />);

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      const scenarios = onUpdateScenarios.mock.calls[0][0];
      expect(scenarios[0].delta.capacity).toBeGreaterThan(0);
      expect(scenarios[0].delta.demand).toBe(0);
    });

    test('scenario includes negative delta for remove capacity', () => {
      const onUpdateScenarios = jest.fn();
      render(<WhatIfPanel {...defaultProps} onUpdateScenarios={onUpdateScenarios} />);

      // Switch to remove mode
      const removeButton = screen.getByText('Remove Capacity');
      fireEvent.click(removeButton);

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      const scenarios = onUpdateScenarios.mock.calls[0][0];
      expect(scenarios[0].delta.capacity).toBeLessThan(0);
    });
  });

  describe('applied scenarios display', () => {
    test('shows active scenarios section when scenarios exist', () => {
      const appliedScenarios = [
        {
          id: 'cap-123',
          type: 'add_capacity',
          description: '+2 devs @ 8h/day',
          color: '#00875A',
          enabled: true,
          delta: { capacity: 320, demand: 0 }
        }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      expect(screen.getByText('Active Scenarios')).toBeInTheDocument();
      expect(screen.getByText('+2 devs @ 8h/day')).toBeInTheDocument();
    });

    test('shows Clear All button when scenarios exist', () => {
      const appliedScenarios = [
        {
          id: 'cap-123',
          type: 'add_capacity',
          description: '+1 dev @ 8h/day',
          enabled: true,
          delta: { capacity: 160, demand: 0 }
        }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    test('Clear All removes all scenarios', () => {
      const onUpdateScenarios = jest.fn();
      const appliedScenarios = [
        { id: 'cap-1', enabled: true, delta: { capacity: 100 } },
        { id: 'cap-2', enabled: true, delta: { capacity: 200 } }
      ];

      render(
        <WhatIfPanel
          {...defaultProps}
          appliedScenarios={appliedScenarios}
          onUpdateScenarios={onUpdateScenarios}
        />
      );

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(onUpdateScenarios).toHaveBeenCalledWith([]);
    });
  });

  describe('toggling scenarios', () => {
    test('checkbox toggles scenario enabled state', () => {
      const onUpdateScenarios = jest.fn();
      const appliedScenarios = [
        {
          id: 'cap-123',
          type: 'add_capacity',
          description: '+1 dev @ 8h/day',
          enabled: true,
          delta: { capacity: 160, demand: 0 }
        }
      ];

      render(
        <WhatIfPanel
          {...defaultProps}
          appliedScenarios={appliedScenarios}
          onUpdateScenarios={onUpdateScenarios}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onUpdateScenarios).toHaveBeenCalled();
      const updatedScenarios = onUpdateScenarios.mock.calls[0][0];
      expect(updatedScenarios[0].enabled).toBe(false);
    });
  });

  describe('removing individual scenarios', () => {
    test('remove button removes specific scenario', () => {
      const onUpdateScenarios = jest.fn();
      const appliedScenarios = [
        { id: 'cap-1', description: 'Scenario 1', enabled: true, delta: {} },
        { id: 'cap-2', description: 'Scenario 2', enabled: true, delta: {} }
      ];

      render(
        <WhatIfPanel
          {...defaultProps}
          appliedScenarios={appliedScenarios}
          onUpdateScenarios={onUpdateScenarios}
        />
      );

      // Find all × buttons (one for each scenario, plus the panel close)
      const removeButtons = screen.getAllByText('×');
      // Click the first scenario's remove button (index 1, as index 0 is panel close)
      fireEvent.click(removeButtons[1]);

      expect(onUpdateScenarios).toHaveBeenCalled();
      const updatedScenarios = onUpdateScenarios.mock.calls[0][0];
      expect(updatedScenarios.length).toBe(1);
      expect(updatedScenarios[0].id).toBe('cap-2');
    });
  });

  describe('combined effect display', () => {
    test('shows combined feasibility when scenarios are applied', () => {
      const appliedScenarios = [
        {
          id: 'cap-123',
          enabled: true,
          delta: { capacity: 50, demand: 0 }
        }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      expect(screen.getByText(/combined feasibility/i)).toBeInTheDocument();
    });

    test('shows capacity change in combined effect', () => {
      const appliedScenarios = [
        {
          id: 'cap-123',
          enabled: true,
          delta: { capacity: 50, demand: 0 }
        }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      // Look for the specific capacity label in combined effect section
      expect(screen.getByText('Capacity:')).toBeInTheDocument();
      expect(screen.getByText(/\+50h/)).toBeInTheDocument();
    });

    test('shows demand change in combined effect', () => {
      const appliedScenarios = [
        {
          id: 'scope-123',
          enabled: true,
          delta: { capacity: 0, demand: -20 }
        }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      // Look for the specific demand label in combined effect section
      expect(screen.getByText('Demand:')).toBeInTheDocument();
      expect(screen.getByText(/-20h/)).toBeInTheDocument();
    });
  });

  describe('multiple scenarios', () => {
    test('combines multiple enabled scenarios', () => {
      const appliedScenarios = [
        { id: 'cap-1', description: 'Add 1 dev', enabled: true, delta: { capacity: 160, demand: 0 } },
        { id: 'scope-1', description: 'Remove scope', enabled: true, delta: { capacity: 0, demand: -20 } }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      // Should show both scenarios
      expect(screen.getByText('Add 1 dev')).toBeInTheDocument();
      expect(screen.getByText('Remove scope')).toBeInTheDocument();
    });

    test('disabled scenarios are shown with line-through', () => {
      const appliedScenarios = [
        { id: 'cap-1', description: 'Disabled scenario', enabled: false, delta: { capacity: 100 } }
      ];

      render(<WhatIfPanel {...defaultProps} appliedScenarios={appliedScenarios} />);

      const scenarioText = screen.getByText('Disabled scenario');
      expect(scenarioText).toHaveStyle({ textDecoration: 'line-through' });
    });
  });
});
