import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DependencyView from './DependencyView';

describe('DependencyView', () => {
  const mockDependencies = {
    dependencies: [
      {
        from: { key: 'PROJ-1', summary: 'First issue' },
        to: { key: 'PROJ-2', summary: 'Second issue' },
        hasConflict: false
      },
      {
        from: { key: 'PROJ-3', summary: 'Third issue' },
        to: { key: 'PROJ-4', summary: 'Fourth issue' },
        hasConflict: true
      }
    ],
    circularDependencies: [],
    rootIssues: [{ key: 'PROJ-1', summary: 'First issue' }],
    leafIssues: [{ key: 'PROJ-4', summary: 'Fourth issue' }],
    summary: {
      totalDependencies: 2,
      totalCircular: 0,
      rootCount: 1,
      maxDepth: 2
    }
  };

  test('renders empty state when no dependencies data', () => {
    render(<DependencyView dependencies={null} />);
    expect(screen.getByText('No dependency data')).toBeInTheDocument();
  });

  test('renders summary statistics', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    // Use getAllByText since '2' appears multiple times (totalDependencies and maxDepth)
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('dependencies')).toBeInTheDocument();
    expect(screen.getByText('circular')).toBeInTheDocument();
    expect(screen.getByText('roots')).toBeInTheDocument();
    expect(screen.getByText('max depth')).toBeInTheDocument();
  });

  test('renders dependency list with blocking relationships', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    // PROJ-1 appears in both dependency list and root issues, so use getAllByText
    const proj1Links = screen.getAllByText('PROJ-1');
    expect(proj1Links.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PROJ-2')).toBeInTheDocument();
    expect(screen.getAllByText('blocks').length).toBeGreaterThanOrEqual(1);
  });

  test('renders issue keys as links', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/browse/PROJ-1');
  });

  test('shows date conflict indicator for conflicting dependencies', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    expect(screen.getByText('Date Conflict')).toBeInTheDocument();
  });

  test('renders show conflicts only checkbox when conflicts exist', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    expect(screen.getByText('Show conflicts only')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  test('filters to show only conflicts when checkbox is checked', () => {
    // Use data without root/leaf issues to avoid duplicate keys
    const depsForFilter = {
      ...mockDependencies,
      rootIssues: [],
      leafIssues: []
    };
    render(<DependencyView dependencies={depsForFilter} />);
    const checkbox = screen.getByRole('checkbox');

    // Initially shows all dependencies (2 items in list)
    expect(screen.getByText('PROJ-1')).toBeInTheDocument();
    expect(screen.getByText('PROJ-3')).toBeInTheDocument();

    // Check the filter
    fireEvent.click(checkbox);

    // Should only show conflicting dependency (PROJ-3 -> PROJ-4)
    expect(screen.getByText('PROJ-3')).toBeInTheDocument();
    // PROJ-1 should not be in the filtered dependency list
    expect(screen.queryByText('PROJ-1')).not.toBeInTheDocument();
  });

  test('does not show conflicts checkbox when no conflicts exist', () => {
    const noConflictsDeps = {
      ...mockDependencies,
      dependencies: mockDependencies.dependencies.map(d => ({ ...d, hasConflict: false }))
    };
    render(<DependencyView dependencies={noConflictsDeps} />);
    expect(screen.queryByText('Show conflicts only')).not.toBeInTheDocument();
  });

  test('renders root issues section', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    expect(screen.getByText('Root Issues (No Blockers)')).toBeInTheDocument();
  });

  test('renders leaf issues section', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    expect(screen.getByText('Leaf Issues (Not Blocking)')).toBeInTheDocument();
  });

  test('renders circular dependency warning when cycles exist', () => {
    const withCycles = {
      ...mockDependencies,
      circularDependencies: [
        {
          description: 'A -> B -> C -> A',
          issues: ['PROJ-A', 'PROJ-B', 'PROJ-C']
        }
      ],
      summary: { ...mockDependencies.summary, totalCircular: 1 }
    };
    render(<DependencyView dependencies={withCycles} />);
    expect(screen.getByText('Circular Dependency Detected')).toBeInTheDocument();
    expect(screen.getByText('A -> B -> C -> A')).toBeInTheDocument();
  });

  test('renders cycle chain with issue links', () => {
    const withCycles = {
      ...mockDependencies,
      circularDependencies: [
        {
          description: 'Cycle detected',
          issues: ['PROJ-A', 'PROJ-B']
        }
      ],
      summary: { ...mockDependencies.summary, totalCircular: 1 }
    };
    render(<DependencyView dependencies={withCycles} />);
    expect(screen.getByText('PROJ-A')).toBeInTheDocument();
    expect(screen.getByText('PROJ-B')).toBeInTheDocument();
  });

  test('shows green color for zero circular dependencies', () => {
    render(<DependencyView dependencies={mockDependencies} />);
    const circularCount = screen.getByText('0');
    expect(circularCount).toHaveStyle({ color: '#00875A' });
  });

  test('shows red color for non-zero circular dependencies', () => {
    const withCycles = {
      ...mockDependencies,
      summary: { ...mockDependencies.summary, totalCircular: 2 }
    };
    render(<DependencyView dependencies={withCycles} />);
    const circularCounts = screen.getAllByText('2');
    // Find the one in the summary section (has the color style)
    const styledCount = circularCounts.find(el => el.style.color === 'rgb(222, 53, 11)');
    expect(styledCount).toBeTruthy();
  });

  test('shows empty state when no dependencies found', () => {
    const emptyDeps = {
      ...mockDependencies,
      dependencies: []
    };
    render(<DependencyView dependencies={emptyDeps} />);
    expect(screen.getByText('No dependencies found')).toBeInTheDocument();
  });

  test('truncates dependency list to 20 items', () => {
    const manyDeps = {
      ...mockDependencies,
      dependencies: Array.from({ length: 25 }, (_, i) => ({
        from: { key: `PROJ-${i}`, summary: `Issue ${i}` },
        to: { key: `PROJ-${i + 100}`, summary: `Issue ${i + 100}` },
        hasConflict: false
      }))
    };
    render(<DependencyView dependencies={manyDeps} />);
    expect(screen.getByText('... and 5 more')).toBeInTheDocument();
  });

  test('truncates root issues to 5 items', () => {
    const manyRoots = {
      ...mockDependencies,
      rootIssues: Array.from({ length: 8 }, (_, i) => ({
        key: `ROOT-${i}`,
        summary: `Root issue ${i}`
      }))
    };
    render(<DependencyView dependencies={manyRoots} />);
    expect(screen.getByText('+3 more')).toBeInTheDocument();
  });
});
