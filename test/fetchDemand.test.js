/**
 * Unit tests for fetchDemand.js resolver
 */

import { fetchDemandIssues, fetchWorklogs } from '../src/resolvers/fetchDemand.js';
import api, { __resetMocks, __setMockResponse } from './__mocks__/@forge/api.js';

describe('fetchDemand', () => {
  beforeEach(() => {
    __resetMocks();
    jest.clearAllMocks();
  });

  describe('fetchDemandIssues', () => {
    test('returns empty array for no issues', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: { issues: [] }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result).toEqual([]);
      expect(api.asApp).toHaveBeenCalled();
    });

    test('normalizes issue data correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test issue',
                status: {
                  name: 'In Progress',
                  statusCategory: { key: 'indeterminate' }
                },
                issuetype: {
                  name: 'Story',
                  hierarchyLevel: 0
                },
                priority: { name: 'High' },
                assignee: { displayName: 'John Doe' },
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 28800, // 8 hours in seconds
                timeestimate: 14400, // 4 hours remaining
                timespent: 14400, // 4 hours spent
                parent: null,
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('TEST-1');
      expect(result[0].summary).toBe('Test issue');
      expect(result[0].status.name).toBe('In Progress');
      expect(result[0].status.category).toBe('indeterminate');
      expect(result[0].issueType.name).toBe('Story');
      expect(result[0].priority).toBe('High');
      expect(result[0].assignee).toBe('John Doe');
      expect(result[0].originalEstimate).toBe(8);
      expect(result[0].remainingEstimate).toBe(4);
      expect(result[0].timeSpent).toBe(4);
    });

    test('parses dates correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].dueDate).toBeInstanceOf(Date);
      expect(result[0].startDate.toISOString()).toContain('2026-01-20');
      expect(result[0].dueDate.toISOString()).toContain('2026-01-24');
    });

    test('handles null dates', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                duedate: null,
                customfield_10015: null,
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].startDate).toBeNull();
      expect(result[0].dueDate).toBeNull();
    });

    test('handles missing fields gracefully', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {}
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].key).toBe('TEST-1');
      expect(result[0].summary).toBe('');
      expect(result[0].status.name).toBe('Unknown');
      expect(result[0].status.category).toBe('undefined');
      expect(result[0].assignee).toBeNull();
    });

    test('extracts blocking links correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Blocker issue',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                issuelinks: [
                  {
                    type: {
                      name: 'Blocks',
                      inward: 'is blocked by',
                      outward: 'blocks'
                    },
                    outwardIssue: {
                      key: 'TEST-2',
                      fields: { summary: 'Blocked issue' }
                    }
                  }
                ]
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].links).toHaveLength(1);
      expect(result[0].links[0].type).toBe('blocks');
      expect(result[0].links[0].targetKey).toBe('TEST-2');
      expect(result[0].links[0].targetSummary).toBe('Blocked issue');
    });

    test('extracts blocked_by links correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10002',
              key: 'TEST-2',
              fields: {
                summary: 'Blocked issue',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                issuelinks: [
                  {
                    type: {
                      name: 'Blocks',
                      inward: 'is blocked by',
                      outward: 'blocks'
                    },
                    inwardIssue: {
                      key: 'TEST-1',
                      fields: { summary: 'Blocker issue' }
                    }
                  }
                ]
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].links).toHaveLength(1);
      expect(result[0].links[0].type).toBe('blocked_by');
      expect(result[0].links[0].targetKey).toBe('TEST-1');
    });

    test('ignores non-blocking link types', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                issuelinks: [
                  {
                    type: {
                      name: 'Relates',
                      inward: 'relates to',
                      outward: 'relates to'
                    },
                    outwardIssue: {
                      key: 'TEST-2',
                      fields: { summary: 'Related issue' }
                    }
                  }
                ]
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].links).toHaveLength(0);
    });

    test('converts time estimates from seconds to hours', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'Test',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                timeoriginalestimate: 36000, // 10 hours
                timeestimate: 18000, // 5 hours
                timespent: 18000, // 5 hours
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].originalEstimate).toBe(10);
      expect(result[0].remainingEstimate).toBe(5);
      expect(result[0].timeSpent).toBe(5);
    });

    test('handles parent issue data', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10002',
              key: 'TEST-2',
              fields: {
                summary: 'Sub-task',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Sub-task', hierarchyLevel: -1 },
                parent: {
                  key: 'TEST-1',
                  fields: { summary: 'Parent story' }
                },
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result[0].parent).toBeDefined();
      expect(result[0].parent.key).toBe('TEST-1');
      expect(result[0].parent.summary).toBe('Parent story');
    });

    test('throws error on API failure', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        error: 'Invalid JQL syntax',
        status: 400
      });

      await expect(fetchDemandIssues('invalid jql'))
        .rejects
        .toThrow('Failed to fetch demand issues');
    });

    test('fetches multiple issues', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '10001',
              key: 'TEST-1',
              fields: {
                summary: 'First issue',
                status: { name: 'Open', statusCategory: { key: 'new' } },
                issuetype: { name: 'Task' },
                issuelinks: []
              }
            },
            {
              id: '10002',
              key: 'TEST-2',
              fields: {
                summary: 'Second issue',
                status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
                issuetype: { name: 'Story' },
                issuelinks: []
              }
            },
            {
              id: '10003',
              key: 'TEST-3',
              fields: {
                summary: 'Third issue',
                status: { name: 'Done', statusCategory: { key: 'done' } },
                issuetype: { name: 'Bug' },
                issuelinks: []
              }
            }
          ]
        }
      });

      const result = await fetchDemandIssues('project = TEST');

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('TEST-1');
      expect(result[1].key).toBe('TEST-2');
      expect(result[2].key).toBe('TEST-3');
    });
  });

  describe('fetchWorklogs', () => {
    test('returns empty array for issues without time spent', async () => {
      const issues = [
        { key: 'TEST-1', timeSpent: 0 },
        { key: 'TEST-2', timeSpent: null }
      ];

      const result = await fetchWorklogs(issues);

      expect(result).toEqual([]);
    });

    test('fetches worklogs for issues with time spent', async () => {
      __setMockResponse('GET:/rest/api/3/issue/TEST-1/worklog', {
        data: {
          worklogs: [
            {
              started: '2026-01-20T09:00:00.000+0000',
              timeSpentSeconds: 14400 // 4 hours
            },
            {
              started: '2026-01-21T09:00:00.000+0000',
              timeSpentSeconds: 7200 // 2 hours
            }
          ]
        }
      });

      const issues = [{ key: 'TEST-1', timeSpent: 6 }];
      const result = await fetchWorklogs(issues);

      expect(result).toHaveLength(2);
      expect(result[0].issueKey).toBe('TEST-1');
      expect(result[0].hours).toBe(4);
      expect(result[1].hours).toBe(2);
    });

    test('handles worklog fetch failure gracefully', async () => {
      __setMockResponse('GET:/rest/api/3/issue/TEST-1/worklog', {
        error: 'Issue not found',
        status: 404
      });

      const issues = [{ key: 'TEST-1', timeSpent: 4 }];
      const result = await fetchWorklogs(issues);

      expect(result).toEqual([]);
    });

    test('fetches worklogs from multiple issues', async () => {
      __setMockResponse('GET:/rest/api/3/issue/TEST-1/worklog', {
        data: {
          worklogs: [
            { started: '2026-01-20T09:00:00.000+0000', timeSpentSeconds: 7200 }
          ]
        }
      });
      __setMockResponse('GET:/rest/api/3/issue/TEST-2/worklog', {
        data: {
          worklogs: [
            { started: '2026-01-21T09:00:00.000+0000', timeSpentSeconds: 3600 }
          ]
        }
      });

      const issues = [
        { key: 'TEST-1', timeSpent: 2 },
        { key: 'TEST-2', timeSpent: 1 }
      ];
      const result = await fetchWorklogs(issues);

      expect(result).toHaveLength(2);
      expect(result.some(w => w.issueKey === 'TEST-1')).toBe(true);
      expect(result.some(w => w.issueKey === 'TEST-2')).toBe(true);
    });

    test('filters out worklogs with invalid dates', async () => {
      __setMockResponse('GET:/rest/api/3/issue/TEST-1/worklog', {
        data: {
          worklogs: [
            { started: '2026-01-20T09:00:00.000+0000', timeSpentSeconds: 7200 },
            { started: null, timeSpentSeconds: 3600 },
            { started: 'invalid-date', timeSpentSeconds: 1800 }
          ]
        }
      });

      const issues = [{ key: 'TEST-1', timeSpent: 4 }];
      const result = await fetchWorklogs(issues);

      // Only the valid worklog should be included
      expect(result).toHaveLength(1);
      expect(result[0].hours).toBe(2);
    });
  });
});
