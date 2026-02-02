import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

/**
 * TeamHealthView - Shows per-person capacity, demand, and utilization with chart
 */
function TeamHealthView({ resources, timeline }) {
  const [selectedUser, setSelectedUser] = useState('all');

  // Calculate team totals
  const totals = useMemo(() => {
    if (!resources || resources.length === 0) return null;
    return resources.reduce((acc, r) => ({
      capacity: acc.capacity + (r.capacity || 0),
      demand: acc.demand + (r.demand || 0),
      timeSpent: acc.timeSpent + (r.timeSpent || 0),
      issueCount: acc.issueCount + (r.issueCount || 0)
    }), { capacity: 0, demand: 0, timeSpent: 0, issueCount: 0 });
  }, [resources]);

  // Calculate per-user timeline data (weekly aggregation)
  const userChartData = useMemo(() => {
    if (!timeline || timeline.length === 0 || !resources || resources.length === 0) {
      return [];
    }

    // Group by week
    const weeks = new Map();
    for (const day of timeline) {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      const dayOfWeek = date.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(date.getDate() + diff);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          capacity: 0,
          demand: 0,
          timeSpent: 0
        });
      }
      const week = weeks.get(weekKey);
      week.capacity += day.capacity || 0;
      week.demand += day.demand || 0;
      week.timeSpent += day.timeSpent || 0;
    }

    // Convert to array
    const weeklyData = Array.from(weeks.values());

    // If a specific user is selected, calculate their proportion
    if (selectedUser !== 'all' && totals) {
      const user = resources.find(r => r.assignee === selectedUser);
      if (user) {
        const capacityRatio = totals.capacity > 0 ? (user.capacity || 0) / totals.capacity : 0;
        const demandRatio = totals.demand > 0 ? (user.demand || 0) / totals.demand : 0;
        const spentRatio = totals.timeSpent > 0 ? (user.timeSpent || 0) / totals.timeSpent : 0;

        return weeklyData.map(week => ({
          ...week,
          capacity: Math.round(week.capacity * capacityRatio * 10) / 10,
          demand: Math.round(week.demand * demandRatio * 10) / 10,
          timeSpent: Math.round(week.timeSpent * spentRatio * 10) / 10
        }));
      }
    }

    return weeklyData.map(week => ({
      ...week,
      capacity: Math.round(week.capacity * 10) / 10,
      demand: Math.round(week.demand * 10) / 10,
      timeSpent: Math.round(week.timeSpent * 10) / 10
    }));
  }, [timeline, resources, selectedUser, totals]);

  // Get stats for selected user
  const selectedStats = useMemo(() => {
    if (selectedUser === 'all') {
      if (!totals) return null;
      const load = totals.capacity > 0 ? Math.round((totals.demand / totals.capacity) * 100) : 0;
      const util = totals.capacity > 0 ? Math.round((totals.timeSpent / totals.capacity) * 100) : 0;
      return { load, util, status: load > 100 ? 'overloaded' : load > 80 ? 'on_track' : 'under_utilized' };
    }
    const user = resources?.find(r => r.assignee === selectedUser);
    if (!user) return null;
    return {
      load: user.loadPercent || 0,
      util: user.utilizationPercent || 0,
      status: user.status
    };
  }, [selectedUser, resources, totals]);

  const getStatusLabel = (status) => {
    const labels = {
      overloaded: 'Overloaded',
      on_track: 'On Track',
      under_utilized: 'Under-utilized',
      no_capacity: 'No Capacity',
      idle: 'Idle'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      overloaded: '#DE350B',
      on_track: '#00875A',
      under_utilized: '#FF8B00',
      no_capacity: '#5E6C84',
      idle: '#5E6C84'
    };
    return colors[status] || '#5E6C84';
  };

  if (!resources || resources.length === 0) {
    return (
      <div className="empty-state">
        <h4>No team data available</h4>
        <p>No assignees found in the current issues.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Chart Header with Dropdown */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: '#5E6C84' }}>Team Member:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #DFE1E6',
              borderRadius: '4px',
              fontSize: '13px',
              background: 'white'
            }}
          >
            <option value="all">All Team</option>
            {resources.map((r, idx) => (
              <option key={idx} value={r.assignee}>{r.assignee}</option>
            ))}
          </select>
        </div>
        {selectedStats && (
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span><strong>{selectedStats.load}%</strong> load</span>
            <span><strong>{selectedStats.util}%</strong> utilized</span>
            <span style={{ color: getStatusColor(selectedStats.status) }}>
              {getStatusLabel(selectedStats.status)}
            </span>
          </div>
        )}
      </div>

      {/* Per-User Chart */}
      {userChartData.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={userChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="#5E6C84"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#5E6C84"
                label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, name) => [`${value}h`, name]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="capacity"
                name="Capacity"
                stroke="#00875A"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="demand"
                name="Demand"
                stroke="#0052CC"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="timeSpent"
                name="Time Spent"
                stroke="#FF8B00"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            fontSize: '12px',
            color: '#5E6C84',
            marginTop: '8px'
          }}>
            <span><span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#00875A', marginRight: '6px', verticalAlign: 'middle', borderTop: '2px dashed #00875A' }}></span>Capacity</span>
            <span><span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#0052CC', marginRight: '6px', verticalAlign: 'middle' }}></span>Demand</span>
            <span><span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#FF8B00', marginRight: '6px', verticalAlign: 'middle' }}></span>Time Spent</span>
          </div>
        </div>
      )}

      {/* Team Summary */}
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '12px 16px',
        background: '#F4F5F7',
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#172B4D' }}>
            {resources.length}
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84' }}>Team Members</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#00875A' }}>
            {totals.capacity.toFixed(1)}h
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84' }}>Total Capacity</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#0052CC' }}>
            {totals.demand.toFixed(1)}h
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84' }}>Total Demand</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#FF8B00' }}>
            {totals.timeSpent.toFixed(1)}h
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84' }}>Time Spent</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#172B4D' }}>
            {totals.issueCount}
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84' }}>Active Issues</div>
        </div>
      </div>

      {/* Team Health Table */}
      <table className="team-health-table">
        <thead>
          <tr>
            <th>Assignee</th>
            <th style={{ textAlign: 'right' }}>Capacity</th>
            <th style={{ textAlign: 'right' }}>Demand</th>
            <th style={{ textAlign: 'right' }}>Load %</th>
            <th style={{ textAlign: 'right' }}>Time Spent</th>
            <th style={{ textAlign: 'right' }}>Utilization %</th>
            <th style={{ textAlign: 'right' }}>Issues</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource, idx) => (
            <tr
              key={idx}
              style={{
                background: selectedUser === resource.assignee ? '#DEEBFF' : undefined,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedUser(resource.assignee)}
            >
              <td>
                <span style={{ fontWeight: 500 }}>{resource.assignee}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                {resource.capacity > 0 ? `${resource.capacity.toFixed(1)}h` : '-'}
              </td>
              <td style={{ textAlign: 'right' }}>
                <span style={{ color: resource.demand > resource.capacity && resource.capacity > 0 ? '#DE350B' : '#172B4D' }}>
                  {resource.demand.toFixed(1)}h
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                {resource.loadPercent !== null ? (
                  <span style={{
                    color: resource.loadPercent > 100 ? '#DE350B' :
                           resource.loadPercent > 80 ? '#FF8B00' : '#00875A'
                  }}>
                    {resource.loadPercent}%
                  </span>
                ) : '-'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {resource.timeSpent.toFixed(1)}h
              </td>
              <td style={{ textAlign: 'right' }}>
                {resource.utilizationPercent !== null ? (
                  <span style={{
                    color: resource.utilizationPercent < 50 ? '#FF8B00' : '#172B4D'
                  }}>
                    {resource.utilizationPercent}%
                  </span>
                ) : '-'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {resource.issueCount}
              </td>
              <td>
                <span className={`status-badge ${resource.status}`}>
                  {getStatusLabel(resource.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Status Legend */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#FAFBFC',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#5E6C84'
      }}>
        <strong>Status definitions:</strong>
        <div style={{ marginTop: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <span><span className="status-badge overloaded">Overloaded</span> Demand exceeds capacity</span>
          <span><span className="status-badge on_track">On Track</span> Load between 80-100%</span>
          <span><span className="status-badge under_utilized">Under-utilized</span> Load below 80%</span>
          <span><span className="status-badge no_capacity">No Capacity</span> No capacity allocated</span>
        </div>
      </div>
    </div>
  );
}

export default TeamHealthView;
