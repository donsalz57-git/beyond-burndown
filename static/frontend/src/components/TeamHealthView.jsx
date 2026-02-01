import React from 'react';

/**
 * TeamHealthView - Shows per-person capacity, demand, and utilization
 */
function TeamHealthView({ resources }) {
  if (!resources || resources.length === 0) {
    return (
      <div className="empty-state">
        <h4>No team data available</h4>
        <p>No assignees found in the current issues.</p>
      </div>
    );
  }

  // Calculate team totals
  const totals = resources.reduce((acc, r) => ({
    capacity: acc.capacity + (r.capacity || 0),
    demand: acc.demand + (r.demand || 0),
    timeSpent: acc.timeSpent + (r.timeSpent || 0),
    issueCount: acc.issueCount + (r.issueCount || 0)
  }), { capacity: 0, demand: 0, timeSpent: 0, issueCount: 0 });

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

  return (
    <div>
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
            <tr key={idx}>
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
