// Jest DOM extends Jest with custom matchers for asserting on DOM nodes
import '@testing-library/jest-dom';

// Mock the @forge/bridge module
jest.mock('@forge/bridge', () => ({
  invoke: jest.fn(),
  view: {
    getContext: jest.fn().mockResolvedValue({ extension: { gadgetConfiguration: {} } })
  }
}));

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
