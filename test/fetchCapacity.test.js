/**
 * Unit tests for fetchCapacity.js resolver
 */

import { fetchCapacityIssues } from '../src/resolvers/fetchCapacity.js';
import api, { __resetMocks, __setMockResponse } from './__mocks__/@forge/api.js';

describe('fetchCapacity', () => {
  beforeEach(() => {
    __resetMocks();
    jest.clearAllMocks();
  });

  describe('fetchCapacityIssues', () => {
    test('returns empty array for no issues', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: { issues: [] }
      });

      const result = await fetchCapacityIssues('project = TEST AND type = Capacity');

      expect(result).toEqual([]);
      expect(api.asApp).toHaveBeenCalled();
    });

    test('normalizes capacity issue data correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Sprint 1 Capacity',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 144000 // 40 hours in seconds
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('CAP-1');
      expect(result[0].summary).toBe('Sprint 1 Capacity');
      expect(result[0].originalEstimate).toBe(40);
    });

    test('parses dates correctly', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Capacity',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 28800
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

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
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Capacity',
                duedate: null,
                customfield_10015: null,
                timeoriginalestimate: 28800
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result[0].startDate).toBeNull();
      expect(result[0].dueDate).toBeNull();
    });

    test('handles null estimate', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Capacity',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: null
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      // secondsToHours returns 0 for null values
      expect(result[0].originalEstimate).toBe(0);
    });

    test('handles missing fields gracefully', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {}
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result[0].key).toBe('CAP-1');
      expect(result[0].summary).toBe('');
      expect(result[0].startDate).toBeNull();
      expect(result[0].dueDate).toBeNull();
      // secondsToHours returns 0 for undefined/null values
      expect(result[0].originalEstimate).toBe(0);
    });

    test('converts estimate from seconds to hours', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Capacity',
                timeoriginalestimate: 108000 // 30 hours
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result[0].originalEstimate).toBe(30);
    });

    test('throws error on API failure', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        error: 'Invalid JQL syntax',
        status: 400
      });

      await expect(fetchCapacityIssues('invalid jql'))
        .rejects
        .toThrow('Failed to fetch capacity issues');
    });

    test('fetches multiple capacity issues', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Developer 1 Capacity',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 144000 // 40 hours
              }
            },
            {
              id: '20002',
              key: 'CAP-2',
              fields: {
                summary: 'Developer 2 Capacity',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 108000 // 30 hours
              }
            },
            {
              id: '20003',
              key: 'CAP-3',
              fields: {
                summary: 'Developer 3 Capacity - PTO',
                duedate: '2026-01-24',
                customfield_10015: '2026-01-20',
                timeoriginalestimate: 72000 // 20 hours
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('CAP-1');
      expect(result[0].originalEstimate).toBe(40);
      expect(result[1].key).toBe('CAP-2');
      expect(result[1].originalEstimate).toBe(30);
      expect(result[2].key).toBe('CAP-3');
      expect(result[2].originalEstimate).toBe(20);
    });

    test('handles different date formats', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '20001',
              key: 'CAP-1',
              fields: {
                summary: 'Capacity',
                duedate: '2026-01-24T00:00:00.000+0000',
                customfield_10015: '2026-01-20T00:00:00.000+0000',
                timeoriginalestimate: 28800
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].dueDate).toBeInstanceOf(Date);
    });

    test('preserves issue id', async () => {
      __setMockResponse('POST:/rest/api/3/search/jql', {
        data: {
          issues: [
            {
              id: '99999',
              key: 'CAP-99',
              fields: {
                summary: 'Test Capacity'
              }
            }
          ]
        }
      });

      const result = await fetchCapacityIssues('project = TEST');

      expect(result[0].id).toBe('99999');
    });
  });
});
