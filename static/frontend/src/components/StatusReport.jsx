import React from 'react';

/**
 * StatusReport - Full management status report view
 */
function StatusReport({ report, confidence }) {
  if (!report) {
    return (
      <div className="empty-state">
        <h4>No report available</h4>
        <p>Report data could not be generated.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      green: '#00875A',
      yellow: '#FF8B00',
      red: '#DE350B',
      on_track: '#00875A',
      minor: '#FF8B00',
      warning: '#FF8B00',
      critical: '#DE350B',
      info: '#0052CC'
    };
    return colors[status] || '#5E6C84';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="status-report">
      {/* Report Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#172B4D' }}>
          Project Status Report
        </h2>
        <div style={{ fontSize: '12px', color: '#5E6C84', marginTop: '4px' }}>
          Generated {formatDate(report.generatedAt)}
        </div>
      </div>

      {/* Headline Metrics */}
      <div className="status-report-section">
        <h3>Headline Metrics</h3>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-value" style={{ color: getStatusColor(report.headline.feasibility.status) }}>
              {report.headline.feasibility.score}%
            </div>
            <div className="metric-label">Feasibility Score</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: getStatusColor(report.headline.forecast.status) }}>
              {report.headline.forecast.extraDays > 0
                ? `+${report.headline.forecast.extraDays} days`
                : 'On Track'}
            </div>
            <div className="metric-label">Forecast vs Deadline</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: getStatusColor(report.headline.capacityUtilization.status) }}>
              {report.headline.capacityUtilization.percent}%
            </div>
            <div className="metric-label">Capacity Utilization</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">
              {report.headline.completion.percent}%
            </div>
            <div className="metric-label">Completion</div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="status-report-section">
        <h3>Schedule</h3>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Deadline</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{formatDate(report.schedule.deadline)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Forecast Completion</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: report.schedule.buffer < 0 ? '#DE350B' : '#00875A' }}>
              {formatDate(report.schedule.forecast)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Buffer</div>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: report.schedule.buffer < 0 ? '#DE350B' : '#00875A'
            }}>
              {report.schedule.bufferLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div className="status-report-section">
        <h3>Capacity</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Available</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#00875A' }}>
              {report.capacity.available}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Demand</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#0052CC' }}>
              {report.capacity.demand}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Time Spent</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#FF8B00' }}>
              {report.capacity.timeSpent}h
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Gap</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: report.capacity.gap > 0 ? '#DE350B' : '#00875A'
            }}>
              {report.capacity.gap > 0 ? '+' : ''}{report.capacity.gap}h
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="status-report-section">
        <h3>Progress</h3>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Issues Closed</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {report.progress.closedCount} ({report.progress.closedHours}h)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Remaining</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {report.progress.remainingCount} ({report.progress.remainingHours}h)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Completion</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              {report.progress.completionPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Risks */}
      <div className="status-report-section">
        <h3>Risks</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{
            padding: '12px',
            background: report.risks.overloadedPeriods.count > 0 ? '#FFEBE6' : '#E3FCEF',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: report.risks.overloadedPeriods.count > 0 ? '#DE350B' : '#00875A' }}>
              {report.risks.overloadedPeriods.count}
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Overloaded Periods</div>
          </div>
          <div style={{
            padding: '12px',
            background: report.risks.complianceViolations.count > 0 ? '#FFFAE6' : '#E3FCEF',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: report.risks.complianceViolations.count > 0 ? '#FF8B00' : '#00875A' }}>
              {report.risks.complianceViolations.count}
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Compliance Violations</div>
          </div>
          <div style={{
            padding: '12px',
            background: report.risks.circularDependencies.count > 0 ? '#FFEBE6' : '#E3FCEF',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: report.risks.circularDependencies.count > 0 ? '#DE350B' : '#00875A' }}>
              {report.risks.circularDependencies.count}
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Circular Dependencies</div>
          </div>
          <div style={{
            padding: '12px',
            background: report.risks.overdueIssues.count > 0 ? '#FFEBE6' : '#E3FCEF',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: report.risks.overdueIssues.count > 0 ? '#DE350B' : '#00875A' }}>
              {report.risks.overdueIssues.count}
            </div>
            <div style={{ fontSize: '12px', color: '#5E6C84' }}>Overdue Issues</div>
          </div>
        </div>
      </div>

      {/* Decisions Needed */}
      {report.decisions && report.decisions.length > 0 && (
        <div className="status-report-section">
          <h3>Decisions Needed</h3>
          {report.decisions.map((decision, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                background: decision.priority === 'high' ? '#FFEBE6' : '#FFFAE6',
                borderLeft: `4px solid ${decision.priority === 'high' ? '#DE350B' : '#FF8B00'}`,
                borderRadius: '4px',
                marginBottom: '8px'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{decision.title}</div>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>{decision.description}</div>
              {decision.options && (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  <strong>Options:</strong> {decision.options.join(' | ')}
                </div>
              )}
              {decision.action && (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  <strong>Action:</strong> {decision.action}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Data Confidence */}
      {confidence && (
        <div className="status-report-section">
          <h3>Data Confidence</h3>
          <div style={{
            padding: '12px',
            background: '#F4F5F7',
            borderRadius: '4px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: confidence.level === 'high' ? '#00875A' : confidence.level === 'medium' ? '#FF8B00' : '#DE350B',
              marginBottom: '8px'
            }}>
              {confidence.overallScore}% - {confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)} Confidence
            </div>
            <div style={{ fontSize: '13px', color: '#5E6C84' }}>
              <div>Estimates: {confidence.breakdown?.estimates?.percent || 0}% complete</div>
              <div>Dates: {confidence.breakdown?.dates?.percent || 0}% complete</div>
              <div>Assignees: {confidence.breakdown?.assignees?.percent || 0}% assigned</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusReport;
