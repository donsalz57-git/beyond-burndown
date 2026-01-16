import React from 'react';

// Violation type labels and descriptions
const VIOLATION_TYPE_INFO = {
  missing_dates: {
    label: 'Missing Dates',
    description: 'Issues without start or due dates'
  },
  missing_estimate: {
    label: 'Missing Estimates',
    description: 'Issues without time estimates'
  },
  done_with_remaining: {
    label: 'Done with Remaining Work',
    description: 'Completed issues that still have remaining estimate'
  },
  overdue: {
    label: 'Overdue',
    description: 'Issues past their due date'
  },
  child_after_parent: {
    label: 'Child After Parent',
    description: 'Child issues due after their parent epic'
  },
  dependency_conflict: {
    label: 'Dependency Conflicts',
    description: 'Blocking issues finish after dependent issues start'
  }
};

function CompliancePanel({ compliance }) {
  if (!compliance || !compliance.violations || compliance.violations.length === 0) {
    return (
      <div className="empty-state">
        <h4>All Clear!</h4>
        <p>No compliance violations detected in the current scope.</p>
      </div>
    );
  }

  const { byType, summary } = compliance;

  // Order types by severity
  const typeOrder = [
    'done_with_remaining',
    'overdue',
    'dependency_conflict',
    'child_after_parent',
    'missing_dates',
    'missing_estimate'
  ];

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
        padding: '12px',
        background: '#F4F5F7',
        borderRadius: '4px'
      }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: '600', color: '#DE350B' }}>
            {summary.bySeverity.error}
          </span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>errors</span>
        </div>
        <div>
          <span style={{ fontSize: '24px', fontWeight: '600', color: '#FF8B00' }}>
            {summary.bySeverity.warning}
          </span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>warnings</span>
        </div>
        <div>
          <span style={{ fontSize: '24px', fontWeight: '600', color: '#0052CC' }}>
            {summary.bySeverity.info}
          </span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>info</span>
        </div>
      </div>

      {/* Violations grouped by type */}
      {typeOrder.map(type => {
        const violations = byType[type];
        if (!violations || violations.length === 0) return null;

        const typeInfo = VIOLATION_TYPE_INFO[type] || { label: type, description: '' };

        return (
          <div key={type} className="violation-group">
            <div className="violation-group-header">
              <span>{typeInfo.label}</span>
              <span style={{
                background: '#DFE1E6',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {violations.length}
              </span>
            </div>
            <ul className="violation-list">
              {violations.slice(0, 10).map((violation, idx) => (
                <li key={idx} className="violation-item">
                  <div className={`severity-indicator ${violation.severity}`}></div>
                  <div className="violation-content">
                    <a
                      href={`/browse/${violation.issueKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="violation-issue"
                    >
                      {violation.issueKey}
                    </a>
                    <span style={{ color: '#5E6C84', marginLeft: '8px' }}>
                      {truncate(violation.issueSummary, 50)}
                    </span>
                    <div className="violation-message">{violation.message}</div>
                  </div>
                </li>
              ))}
              {violations.length > 10 && (
                <li style={{
                  padding: '8px 12px',
                  color: '#5E6C84',
                  fontSize: '13px',
                  fontStyle: 'italic'
                }}>
                  ... and {violations.length - 10} more
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

export default CompliancePanel;
