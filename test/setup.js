// Test setup file for Beyond Burndown

// Global mock responses storage
global.mockResponses = {};
global.mockStorageData = {};

// Reset function for tests
global.resetMocks = function() {
  global.mockResponses = {};
  global.mockStorageData = {};
};

// Set mock response for a specific endpoint
global.setMockResponse = function(endpoint, response) {
  global.mockResponses[endpoint] = response;
};

// Set mock storage data
global.setStorageData = function(key, value) {
  global.mockStorageData[key] = value;
};

// Create mock response helper
global.mockCreateResponse = function(data, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
  };
};

// Helper to create Jira issue mock data
global.createMockIssue = function(overrides = {}) {
  return {
    id: overrides.id || '10001',
    key: overrides.key || 'TEST-1',
    fields: {
      summary: overrides.summary || 'Test Issue',
      status: {
        name: overrides.statusName || 'In Progress',
        statusCategory: {
          key: overrides.statusCategory || 'indeterminate'
        }
      },
      issuetype: {
        name: overrides.issueType || 'Story',
        hierarchyLevel: overrides.hierarchyLevel || 0
      },
      priority: {
        name: overrides.priority || 'Medium'
      },
      assignee: overrides.assignee ? { displayName: overrides.assignee } : null,
      duedate: overrides.dueDate || null,
      customfield_10015: overrides.startDate || null,
      timeoriginalestimate: overrides.originalEstimate || null,
      timeestimate: overrides.remainingEstimate || null,
      timespent: overrides.timeSpent || null,
      parent: overrides.parent || null,
      issuelinks: overrides.issuelinks || []
    }
  };
};

// Helper to create capacity issue mock data
global.createMockCapacityIssue = function(overrides = {}) {
  return {
    id: overrides.id || '20001',
    key: overrides.key || 'CAP-1',
    fields: {
      summary: overrides.summary || 'Capacity Issue',
      duedate: overrides.dueDate || null,
      customfield_10015: overrides.startDate || null,
      timeoriginalestimate: overrides.originalEstimate || null
    }
  };
};

// Suppress console.log during tests (optional - comment out to debug)
// global.console.log = jest.fn();
