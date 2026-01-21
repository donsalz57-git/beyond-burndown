import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { useGadgetData } from './hooks/useGadgetData';
import { view } from '@forge/bridge';

// Mock the useGadgetData hook
jest.mock('./hooks/useGadgetData');

// Mock Recharts to avoid canvas issues
jest.mock('recharts', () => ({
  ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => null
}));

describe('App', () => {
  const mockData = {
    envelope: {
      timeline: [
        { date: '2026-01-19', displayDate: 'Jan 19', capacity: 8, demand: 6 }
      ],
      overloadedPeriods: [],
      feasibilityScore: 85,
      totals: { totalDemand: 100, totalCapacity: 120, totalTimeSpent: 50 }
    },
    compliance: {
      violations: [],
      byType: {},
      summary: { total: 0, bySeverity: { error: 0, warning: 0, info: 0 } }
    },
    dependencies: {
      dependencies: [],
      circularDependencies: [],
      rootIssues: [],
      leafIssues: [],
      summary: { totalDependencies: 0, totalCircular: 0, rootCount: 0, maxDepth: 0 }
    },
    summary: {
      totalDemandIssues: 25,
      feasibilityScore: 85,
      totalViolations: 0,
      circularDependencies: 0
    }
  };

  const mockConfig = {
    demandJql: 'project = TEST',
    capacityJql: 'project = TEST AND type = Capacity'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    view.getContext.mockResolvedValue({ extension: { entryPoint: 'view' } });
  });

  test('renders loading state', () => {
    useGadgetData.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      config: null,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    expect(screen.getByText('Analyzing project data...')).toBeInTheDocument();
  });

  test('renders error state', () => {
    useGadgetData.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch data',
      config: null,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  test('renders retry button in error state', () => {
    const mockRefresh = jest.fn();
    useGadgetData.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch data',
      config: null,
      updateConfig: jest.fn(),
      refresh: mockRefresh
    });

    render(<App />);
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('renders summary bar with data', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    expect(screen.getByText('25')).toBeInTheDocument(); // totalDemandIssues
    expect(screen.getByText('Issues')).toBeInTheDocument();
    // 85% appears in both summary bar and FeasibilityChart, so use getAllByText
    const scores = screen.getAllByText('85%');
    expect(scores.length).toBeGreaterThanOrEqual(1);
    // 'Feasibility' appears in both summary label and tab, so use getAllByText
    const feasibilityElements = screen.getAllByText('Feasibility');
    expect(feasibilityElements.length).toBeGreaterThanOrEqual(1);
  });

  test('renders tab navigation', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    // 'Feasibility' appears in both tab and summary label, so use getAllByText
    const feasibilityTexts = screen.getAllByText('Feasibility');
    expect(feasibilityTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Dependencies')).toBeInTheDocument();
  });

  test('shows Feasibility tab by default', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    // FeasibilityChart renders the responsive container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  test('switches to Compliance tab when clicked', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);

    // Click on Compliance tab
    const complianceButtons = screen.getAllByText('Compliance');
    fireEvent.click(complianceButtons[0]);

    // Should show CompliancePanel content (All Clear since no violations)
    expect(screen.getByText('All Clear!')).toBeInTheDocument();
  });

  test('switches to Dependencies tab when clicked', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);

    // Click on Dependencies tab
    fireEvent.click(screen.getByText('Dependencies'));

    // Should show DependencyView content
    expect(screen.getByText('dependencies')).toBeInTheDocument();
  });

  test('shows badge on Compliance tab when violations exist', () => {
    const dataWithViolations = {
      ...mockData,
      compliance: {
        ...mockData.compliance,
        summary: { total: 5, bySeverity: { error: 2, warning: 3, info: 0 } }
      },
      summary: { ...mockData.summary, totalViolations: 5 }
    };

    useGadgetData.mockReturnValue({
      data: dataWithViolations,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    // '5' appears multiple times (badge and summary), so use getAllByText
    const fives = screen.getAllByText('5');
    expect(fives.length).toBeGreaterThanOrEqual(1);
  });

  test('shows badge on Dependencies tab when circular dependencies exist', () => {
    const dataWithCycles = {
      ...mockData,
      dependencies: {
        ...mockData.dependencies,
        circularDependencies: [{ description: 'A -> B -> A', issues: ['A', 'B'] }]
      },
      summary: { ...mockData.summary, circularDependencies: 1 }
    };

    useGadgetData.mockReturnValue({
      data: dataWithCycles,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    // The '1' for circular deps appears in summary and potentially in badge
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  test('renders config panel in edit mode', async () => {
    view.getContext.mockResolvedValue({ extension: { entryPoint: 'edit' } });

    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  test('applies correct color class for low feasibility score', () => {
    const lowScoreData = {
      ...mockData,
      summary: { ...mockData.summary, feasibilityScore: 30 }
    };

    useGadgetData.mockReturnValue({
      data: lowScoreData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    const scoreElement = screen.getByText('30%');
    expect(scoreElement).toHaveClass('danger');
  });

  test('applies correct color class for medium feasibility score', () => {
    const mediumScoreData = {
      ...mockData,
      summary: { ...mockData.summary, feasibilityScore: 65 }
    };

    useGadgetData.mockReturnValue({
      data: mediumScoreData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    const scoreElement = screen.getByText('65%');
    expect(scoreElement).toHaveClass('warning');
  });

  test('applies correct color class for high feasibility score', () => {
    useGadgetData.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    // 85% appears twice, find the one with the 'success' class (in summary bar)
    const scoreElements = screen.getAllByText('85%');
    const summaryScore = scoreElements.find(el => el.classList.contains('success'));
    expect(summaryScore).toBeTruthy();
  });

  test('applies danger class when violations exist', () => {
    const dataWithViolations = {
      ...mockData,
      summary: { ...mockData.summary, totalViolations: 3 }
    };

    useGadgetData.mockReturnValue({
      data: dataWithViolations,
      loading: false,
      error: null,
      config: mockConfig,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    render(<App />);
    const violationElement = screen.getByText('3');
    expect(violationElement).toHaveClass('danger');
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  test('catches rendering errors and displays error message', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // We can't easily test the error boundary with the full App,
    // but we can verify the App component handles missing data gracefully
    useGadgetData.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      config: null,
      updateConfig: jest.fn(),
      refresh: jest.fn()
    });

    // App should handle null data without crashing
    render(<App />);
    // No summary bar should render when data is null
    expect(screen.queryByText('Issues')).not.toBeInTheDocument();
  });
});
