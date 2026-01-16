import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';

/**
 * Custom hook for fetching and managing gadget data
 * Handles loading config, fetching analysis data, and saving config
 */
export function useGadgetData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);

  // Load configuration from storage
  const loadConfig = useCallback(async () => {
    try {
      const result = await invoke('loadConfig');
      if (result.success) {
        setConfig(result.config);
        return result.config;
      } else {
        // Use default config
        const defaultConfig = {
          demandJql: 'project = DEV and Summary !~ Capacity',
          capacityJql: 'project = DEV and Summary ~ Capacity',
          hoursPerDayField: 'customfield_10000'
        };
        setConfig(defaultConfig);
        return defaultConfig;
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      const defaultConfig = {
        demandJql: 'project = DEV and Summary !~ Capacity',
        capacityJql: 'project = DEV and Summary ~ Capacity',
        hoursPerDayField: 'customfield_10000'
      };
      setConfig(defaultConfig);
      return defaultConfig;
    }
  }, []);

  // Fetch analysis data using current config
  const fetchData = useCallback(async (currentConfig) => {
    setLoading(true);
    setError(null);

    try {
      const result = await invoke('getData', {
        demandJql: currentConfig.demandJql,
        capacityJql: currentConfig.capacityJql,
        hoursPerDayField: currentConfig.hoursPerDayField
      });

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const loadedConfig = await loadConfig();
      if (mounted) {
        await fetchData(loadedConfig);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadConfig, fetchData]);

  // Save configuration
  const updateConfig = useCallback(async (newConfig) => {
    try {
      const result = await invoke('saveConfig', newConfig);
      if (result.success) {
        setConfig(newConfig);
        return true;
      } else {
        console.error('Failed to save config:', result.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      return false;
    }
  }, []);

  // Refresh data with current config
  const refresh = useCallback(async () => {
    if (config) {
      await fetchData(config);
    }
  }, [config, fetchData]);

  return {
    data,
    loading,
    error,
    config,
    updateConfig,
    refresh
  };
}
