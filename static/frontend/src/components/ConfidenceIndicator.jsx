import React, { useState } from 'react';

/**
 * ConfidenceIndicator - Shows data quality score with tooltip breakdown
 */
function ConfidenceIndicator({ confidence }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!confidence) return null;

  const levelColors = {
    high: '#00875A',
    medium: '#FF8B00',
    low: '#DE350B'
  };

  const levelLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };

  const color = levelColors[confidence.level] || '#5E6C84';

  return (
    <div
      className="confidence-indicator"
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: `${color}15`,
          border: `1px solid ${color}`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color
          }}
        />
        <span style={{ fontSize: '12px', color: color, fontWeight: 500 }}>
          {levelLabels[confidence.level]} Confidence
        </span>
      </div>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#172B4D',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            minWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
            Data Quality: {confidence.overallScore}%
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Estimates:</span>
              <span style={{ color: confidence.breakdown?.estimates?.percent >= 80 ? '#57D9A3' : '#FF8B00' }}>
                {confidence.breakdown?.estimates?.count}/{confidence.breakdown?.estimates?.total} ({confidence.breakdown?.estimates?.percent}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dates:</span>
              <span style={{ color: confidence.breakdown?.dates?.percent >= 80 ? '#57D9A3' : '#FF8B00' }}>
                {confidence.breakdown?.dates?.count}/{confidence.breakdown?.dates?.total} ({confidence.breakdown?.dates?.percent}%)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Assignees:</span>
              <span style={{ color: confidence.breakdown?.assignees?.percent >= 80 ? '#57D9A3' : '#FF8B00' }}>
                {confidence.breakdown?.assignees?.count}/{confidence.breakdown?.assignees?.total} ({confidence.breakdown?.assignees?.percent}%)
              </span>
            </div>
          </div>

          {confidence.warnings && confidence.warnings.length > 0 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #344563' }}>
              {confidence.warnings.map((warning, i) => (
                <div key={i} style={{ color: '#FF8B00', fontSize: '11px' }}>
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* Tooltip arrow */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #172B4D'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ConfidenceIndicator;
