import { renderHook, act, waitFor } from '@testing-library/react';
import { useGadgetData } from './useGadgetData';
import { invoke } from '@forge/bridge';

// Mock the @forge/bridge module
jest.mock('@forge/bridge', () => ({
  invoke: jest.fn()
}));

describe('useGadgetData', () => {
  const mockConfig = {
    demandJql: 'project = TEST',
    capacityJql: 'project = TEST AND type = Capacity',
    hoursPerDayField: 'customfield_10000'
  };

  const mockData = {
    envelope: { timeline: [], feasibilityScore: 85 },
    compliance: { violations: [], summary: { total: 0 } },
    dependencies: { dependencies: [], circularDependencies: [] },
    summary: { totalDemandIssues: 10 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts with loading state', () => {
    invoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useGadgetData());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('loads config and data on mount', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockResolvedValueOnce({ success: true, data: mockData }); // getData

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.error).toBeNull();
  });

  test('uses default config when loadConfig fails', async () => {
    invoke
      .mockResolvedValueOnce({ success: false }) // loadConfig fails
      .mockResolvedValueOnce({ success: true, data: mockData }); // getData

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use default config
    expect(result.current.config.demandJql).toContain('DEV');
  });

  test('uses default config when loadConfig throws', async () => {
    invoke
      .mockRejectedValueOnce(new Error('Network error')) // loadConfig throws
      .mockResolvedValueOnce({ success: true, data: mockData }); // getData

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use default config
    expect(result.current.config).toBeTruthy();
  });

  test('sets error when getData fails', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockResolvedValueOnce({ success: false, error: 'JQL syntax error' }); // getData fails

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('JQL syntax error');
    expect(result.current.data).toBeNull();
  });

  test('sets error when getData throws', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockRejectedValueOnce(new Error('Network error')); // getData throws

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  test('updateConfig saves config and updates state', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockResolvedValueOnce({ success: true, data: mockData }) // getData
      .mockResolvedValueOnce({ success: true }); // saveConfig

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newConfig = { ...mockConfig, demandJql: 'project = NEW' };

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateConfig(newConfig);
    });

    expect(updateResult).toBe(true);
    expect(result.current.config).toEqual(newConfig);
    expect(invoke).toHaveBeenCalledWith('saveConfig', newConfig);
  });

  test('updateConfig returns false on failure', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockResolvedValueOnce({ success: true, data: mockData }) // getData
      .mockResolvedValueOnce({ success: false, error: 'Save failed' }); // saveConfig fails

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateConfig({ demandJql: 'new' });
    });

    expect(updateResult).toBe(false);
  });

  test('refresh fetches data again with current config', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockResolvedValueOnce({ success: true, data: mockData }) // getData (initial)
      .mockResolvedValueOnce({ success: true, data: { ...mockData, summary: { totalDemandIssues: 20 } } }); // getData (refresh)

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data.summary.totalDemandIssues).toBe(10);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data.summary.totalDemandIssues).toBe(20);
  });

  test('refresh uses default config when loadConfig failed', async () => {
    invoke
      .mockResolvedValueOnce({ success: false }) // loadConfig fails, sets default config
      .mockResolvedValueOnce({ success: true, data: mockData }) // getData (initial)
      .mockResolvedValueOnce({ success: true, data: { ...mockData, summary: { totalDemandIssues: 15 } } }); // getData (refresh)

    const { result } = renderHook(() => useGadgetData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Config should be default (not null) even when loadConfig failed
    expect(result.current.config).toBeTruthy();

    await act(async () => {
      await result.current.refresh();
    });

    // Refresh should work with default config
    expect(result.current.data.summary.totalDemandIssues).toBe(15);
  });

  test('cleans up on unmount', async () => {
    let resolveConfig;
    invoke.mockImplementation(() => new Promise(resolve => {
      resolveConfig = resolve;
    }));

    const { unmount } = renderHook(() => useGadgetData());

    // Unmount before promise resolves
    unmount();

    // Resolve after unmount - should not cause errors
    resolveConfig({ success: true, config: mockConfig });

    // No error should be thrown
  });

  test('sets loading to true during fetch', async () => {
    let resolveGetData;
    invoke
      .mockResolvedValueOnce({ success: true, config: mockConfig }) // loadConfig
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveGetData = resolve;
      })); // getData

    const { result } = renderHook(() => useGadgetData());

    // Wait for loadConfig to complete
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2);
    });

    expect(result.current.loading).toBe(true);

    // Resolve getData
    resolveGetData({ success: true, data: mockData });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
