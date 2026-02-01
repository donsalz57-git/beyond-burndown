/**
 * Unit tests for fetchCapacity.js resolver
 */

import {
  fetchCapacityIssues,
  buildManualCapacityIssues,
  buildTeamCapacityIssue,
  buildVariableCapacityIssues
} from '../src/resolvers/fetchCapacity.js';
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

  describe('buildManualCapacityIssues', () => {
    const rangeStart = new Date('2026-02-01');
    const rangeEnd = new Date('2026-02-28');

    test('returns empty array for no team members', () => {
      const result = buildManualCapacityIssues([], 'week', rangeStart, rangeEnd);
      expect(result).toEqual([]);
    });

    test('returns empty array for null team members', () => {
      const result = buildManualCapacityIssues(null, 'week', rangeStart, rangeEnd);
      expect(result).toEqual([]);
    });

    test('creates capacity issues for team members', () => {
      const teamMembers = [
        { name: 'Alice', hoursPerPeriod: 40 },
        { name: 'Bob', hoursPerPeriod: 32 }
      ];

      const result = buildManualCapacityIssues(teamMembers, 'week', rangeStart, rangeEnd);

      expect(result).toHaveLength(2);
      expect(result[0].assignee).toBe('Alice');
      expect(result[1].assignee).toBe('Bob');
    });

    test('generates unique keys for each member', () => {
      const teamMembers = [
        { name: 'Alice', hoursPerPeriod: 40 },
        { name: 'Bob', hoursPerPeriod: 32 }
      ];

      const result = buildManualCapacityIssues(teamMembers, 'week', rangeStart, rangeEnd);

      expect(result[0].key).toBe('CAPACITY-1');
      expect(result[1].key).toBe('CAPACITY-2');
    });

    test('uses member start/end dates if provided', () => {
      const teamMembers = [
        {
          name: 'Alice',
          hoursPerPeriod: 40,
          startDate: '2026-02-10',
          endDate: '2026-02-20'
        }
      ];

      const result = buildManualCapacityIssues(teamMembers, 'week', rangeStart, rangeEnd);

      expect(result[0].startDate.toISOString()).toContain('2026-02-10');
      expect(result[0].dueDate.toISOString()).toContain('2026-02-20');
    });

    test('uses range dates if member dates not provided', () => {
      const teamMembers = [
        { name: 'Alice', hoursPerPeriod: 40 }
      ];

      const result = buildManualCapacityIssues(teamMembers, 'week', rangeStart, rangeEnd);

      expect(result[0].startDate).toEqual(rangeStart);
      expect(result[0].dueDate).toEqual(rangeEnd);
    });

    test('calculates hours correctly for weekly period', () => {
      const teamMembers = [
        { name: 'Alice', hoursPerPeriod: 40 }
      ];
      const start = new Date('2026-02-02'); // Monday
      const end = new Date('2026-02-06'); // Friday - 5 days

      const result = buildManualCapacityIssues(teamMembers, 'week', start, end);

      // 5 days, ~4 business days (5/7 ratio), 40hrs/5days = 8hrs/day
      expect(result[0].originalEstimate).toBeGreaterThan(0);
    });
  });

  describe('buildTeamCapacityIssue', () => {
    const rangeStart = new Date('2026-02-01');
    const rangeEnd = new Date('2026-02-28');

    test('returns empty array for zero hours', () => {
      const result = buildTeamCapacityIssue(0, 'week', rangeStart, rangeEnd);
      expect(result).toEqual([]);
    });

    test('returns empty array for negative hours', () => {
      const result = buildTeamCapacityIssue(-10, 'week', rangeStart, rangeEnd);
      expect(result).toEqual([]);
    });

    test('creates single capacity issue for team', () => {
      const result = buildTeamCapacityIssue(160, 'week', rangeStart, rangeEnd);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('CAPACITY-TEAM');
      expect(result[0].summary).toBe('Team Capacity');
      expect(result[0].assignee).toBeNull();
    });

    test('sets correct date range', () => {
      const result = buildTeamCapacityIssue(160, 'week', rangeStart, rangeEnd);

      expect(result[0].startDate).toEqual(rangeStart);
      expect(result[0].dueDate).toEqual(rangeEnd);
    });

    test('calculates total hours for date range', () => {
      const result = buildTeamCapacityIssue(160, 'week', rangeStart, rangeEnd);

      expect(result[0].originalEstimate).toBeGreaterThan(0);
    });
  });

  describe('buildVariableCapacityIssues', () => {
    test('returns empty array for empty schedule', () => {
      const result = buildVariableCapacityIssues([], 'team', 'week');
      expect(result).toEqual([]);
    });

    test('returns empty array for null schedule', () => {
      const result = buildVariableCapacityIssues(null, 'team', 'week');
      expect(result).toEqual([]);
    });

    test('creates capacity issues for team schedule', () => {
      const schedule = [
        { id: '1', startDate: '2026-02-01', teamHours: 160, memberHours: {} },
        { id: '2', startDate: '2026-02-08', teamHours: 120, memberHours: {} }
      ];

      const result = buildVariableCapacityIssues(schedule, 'team', 'week');

      expect(result).toHaveLength(2);
      expect(result[0].originalEstimate).toBe(160);
      expect(result[1].originalEstimate).toBe(120);
    });

    test('sorts schedule by date', () => {
      const schedule = [
        { id: '2', startDate: '2026-02-08', teamHours: 120, memberHours: {} },
        { id: '1', startDate: '2026-02-01', teamHours: 160, memberHours: {} }
      ];

      const result = buildVariableCapacityIssues(schedule, 'team', 'week');

      expect(result[0].startDate.toISOString()).toContain('2026-02-01');
      expect(result[1].startDate.toISOString()).toContain('2026-02-08');
    });

    test('creates per-member issues for individual schedule', () => {
      const schedule = [
        {
          id: '1',
          startDate: '2026-02-01',
          teamHours: 0,
          memberHours: { 'Alice': 40, 'Bob': 32 }
        }
      ];

      const result = buildVariableCapacityIssues(schedule, 'individual', 'week');

      expect(result).toHaveLength(2);
      const alice = result.find(r => r.assignee === 'Alice');
      const bob = result.find(r => r.assignee === 'Bob');
      expect(alice.originalEstimate).toBe(40);
      expect(bob.originalEstimate).toBe(32);
    });

    test('skips members with zero hours', () => {
      const schedule = [
        {
          id: '1',
          startDate: '2026-02-01',
          teamHours: 0,
          memberHours: { 'Alice': 40, 'Bob': 0 }
        }
      ];

      const result = buildVariableCapacityIssues(schedule, 'individual', 'week');

      expect(result).toHaveLength(1);
      expect(result[0].assignee).toBe('Alice');
    });

    test('calculates end date based on next entry', () => {
      const schedule = [
        { id: '1', startDate: '2026-02-01', teamHours: 160, memberHours: {} },
        { id: '2', startDate: '2026-02-08', teamHours: 120, memberHours: {} }
      ];

      const result = buildVariableCapacityIssues(schedule, 'team', 'week');

      // First entry should end day before second entry
      expect(result[0].dueDate.toISOString()).toContain('2026-02-07');
    });

    test('handles single entry schedule', () => {
      const schedule = [
        { id: '1', startDate: '2026-02-01', teamHours: 160, memberHours: {} }
      ];

      const result = buildVariableCapacityIssues(schedule, 'team', 'week');

      expect(result).toHaveLength(1);
      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].dueDate).toBeInstanceOf(Date);
    });

    test('handles monthly period for last entry', () => {
      const schedule = [
        { id: '1', startDate: '2026-02-01', teamHours: 160, memberHours: {} }
      ];

      const result = buildVariableCapacityIssues(schedule, 'team', 'month');

      expect(result).toHaveLength(1);
      // End date should be roughly a month after start
      const startDate = result[0].startDate;
      const dueDate = result[0].dueDate;
      const daysDiff = (dueDate - startDate) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThanOrEqual(27);
    });
  });
});
