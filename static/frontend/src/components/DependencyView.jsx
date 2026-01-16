import React, { useState } from 'react';

function DependencyView({ dependencies }) {
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  if (!dependencies) {
    return (
      <div className="empty-state">
        <h4>No dependency data</h4>
        <p>Unable to load dependency information.</p>
      </div>
    );
  }

  const {
    dependencies: depList,
    circularDependencies,
    rootIssues,
    leafIssues,
    summary
  } = dependencies;

  const filteredDeps = showConflictsOnly
    ? depList.filter(d => d.hasConflict)
    : depList;

  return (
    <div>
      {/* Summary Stats */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '16px',
        padding: '12px',
        background: '#F4F5F7',
        borderRadius: '4px'
      }}>
        <div>
          <span style={{ fontSize: '20px', fontWeight: '600' }}>{summary.totalDependencies}</span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>dependencies</span>
        </div>
        <div>
          <span style={{
            fontSize: '20px',
            fontWeight: '600',
            color: summary.totalCircular > 0 ? '#DE350B' : '#00875A'
          }}>
            {summary.totalCircular}
          </span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>circular</span>
        </div>
        <div>
          <span style={{ fontSize: '20px', fontWeight: '600' }}>{summary.rootCount}</span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>roots</span>
        </div>
        <div>
          <span style={{ fontSize: '20px', fontWeight: '600' }}>{summary.maxDepth}</span>
          <span style={{ fontSize: '12px', color: '#5E6C84', marginLeft: '4px' }}>max depth</span>
        </div>
      </div>

      {/* Circular Dependencies Warning */}
      {circularDependencies.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {circularDependencies.map((cycle, idx) => (
            <div key={idx} className="circular-warning">
              <h4>Circular Dependency Detected</h4>
              <p>{cycle.description}</p>
              <div style={{ marginTop: '8px' }}>
                {cycle.issues.map((issueKey, i) => (
                  <span key={issueKey}>
                    <a
                      href={`/browse/${issueKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      {issueKey}
                    </a>
                    {i < cycle.issues.length - 1 && (
                      <span style={{ margin: '0 8px', color: '#5E6C84' }}>→</span>
                    )}
                  </span>
                ))}
                <span style={{ margin: '0 8px', color: '#DE350B' }}>→ {cycle.issues[0]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Toggle */}
      {depList.some(d => d.hasConflict) && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showConflictsOnly}
              onChange={(e) => setShowConflictsOnly(e.target.checked)}
            />
            <span style={{ fontSize: '13px' }}>Show conflicts only</span>
          </label>
        </div>
      )}

      {/* Dependency List */}
      {filteredDeps.length === 0 ? (
        <div className="empty-state">
          <h4>No dependencies found</h4>
          <p>No blocking relationships detected in the current scope.</p>
        </div>
      ) : (
        <ul className="dependency-list">
          {filteredDeps.slice(0, 20).map((dep, idx) => (
            <li key={idx} className={`dependency-item ${dep.hasConflict ? 'conflict' : ''}`}>
              <a
                href={`/browse/${dep.from.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="issue-link"
              >
                {dep.from.key}
              </a>
              <span className="dependency-arrow">→</span>
              <span style={{ color: '#5E6C84', fontSize: '13px' }}>blocks</span>
              <span className="dependency-arrow">→</span>
              <a
                href={`/browse/${dep.to.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="issue-link"
              >
                {dep.to.key}
              </a>
              {dep.hasConflict && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: '#DE350B',
                  fontWeight: '500'
                }}>
                  Date Conflict
                </span>
              )}
            </li>
          ))}
          {filteredDeps.length > 20 && (
            <li style={{
              padding: '8px 12px',
              color: '#5E6C84',
              fontSize: '13px',
              fontStyle: 'italic'
            }}>
              ... and {filteredDeps.length - 20} more
            </li>
          )}
        </ul>
      )}

      {/* Root and Leaf Issues */}
      {(rootIssues.length > 0 || leafIssues.length > 0) && (
        <div style={{ marginTop: '24px', display: 'flex', gap: '24px' }}>
          {rootIssues.length > 0 && (
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Root Issues (No Blockers)</h4>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                {rootIssues.slice(0, 5).map(issue => (
                  <div key={issue.key} style={{ marginBottom: '4px' }}>
                    <a
                      href={`/browse/${issue.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      {issue.key}
                    </a>
                  </div>
                ))}
                {rootIssues.length > 5 && (
                  <div style={{ fontStyle: 'italic' }}>+{rootIssues.length - 5} more</div>
                )}
              </div>
            </div>
          )}
          {leafIssues.length > 0 && (
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Leaf Issues (Not Blocking)</h4>
              <div style={{ fontSize: '13px', color: '#5E6C84' }}>
                {leafIssues.slice(0, 5).map(issue => (
                  <div key={issue.key} style={{ marginBottom: '4px' }}>
                    <a
                      href={`/browse/${issue.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="issue-link"
                    >
                      {issue.key}
                    </a>
                  </div>
                ))}
                {leafIssues.length > 5 && (
                  <div style={{ fontStyle: 'italic' }}>+{leafIssues.length - 5} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DependencyView;
