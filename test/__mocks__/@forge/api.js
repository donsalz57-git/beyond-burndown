// Mock for @forge/api

// Store mock responses for tests to configure
let mockResponses = {};
let mockStorageData = {};

// Reset function for tests
export function __resetMocks() {
  mockResponses = {};
  mockStorageData = {};
}

// Set mock response for a specific endpoint
export function __setMockResponse(endpoint, response) {
  mockResponses[endpoint] = response;
}

// Set mock storage data
export function __setStorageData(key, value) {
  mockStorageData[key] = value;
}

// Get all mock responses (for debugging)
export function __getMockResponses() {
  return mockResponses;
}

// Mock route template literal function
export function route(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += values[i] + strings[i + 1];
  }
  return result;
}

// Mock storage object
export const storage = {
  get: jest.fn(async (key) => {
    return mockStorageData[key] || null;
  }),
  set: jest.fn(async (key, value) => {
    mockStorageData[key] = value;
  }),
  delete: jest.fn(async (key) => {
    delete mockStorageData[key];
  })
};

// Mock API response
function createMockResponse(data, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
  };
}

// Mock requestJira function
const requestJira = jest.fn(async (endpoint, options = {}) => {
  // Check if we have a specific mock for this endpoint
  const mockKey = `${options.method || 'GET'}:${endpoint}`;
  const mockData = mockResponses[mockKey] || mockResponses[endpoint];

  if (mockData) {
    if (mockData.error) {
      return createMockResponse(mockData.error, false, mockData.status || 400);
    }
    return createMockResponse(mockData.data || mockData, true, 200);
  }

  // Default successful response for unregistered endpoints
  return createMockResponse({ issues: [] }, true, 200);
});

// Mock asApp function that returns requestJira
const asApp = jest.fn(() => ({
  requestJira
}));

// Default export
const api = {
  asApp,
  requestJira
};

export default api;
export { requestJira };
