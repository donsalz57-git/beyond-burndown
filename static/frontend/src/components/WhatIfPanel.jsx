import React, { useState, useMemo } from 'react';
import {
  applyAddCapacity,
  applyRemoveScope,
  applyExtendDeadline
} from '../utils/scenarioCalculator';

/**
 * WhatIfPanel - Scenario modeling UI for what-if analysis
 */
function WhatIfPanel({ envelope, isOpen, onClose }) {
  const [scenarioType, setScenarioType] = useState('add_capacity');
  const [developers, setDevelopers] = useState(1);
  const [hoursToRemove, setHoursToRemove] = useState(20);
  const [weeksToExtend, setWeeksToExtend] = useState(1);

  // Calculate scenario result based on current inputs
  const scenarioResult = useMemo(() => {
    if (!envelope) return null;

    switch (scenarioType) {
      case 'add_capacity':
        return applyAddCapacity(envelope, developers);
      case 'remove_scope':
        return applyRemoveScope(envelope, hoursToRemove);
      case 'extend_deadline':
        return applyExtendDeadline(envelope, weeksToExtend);
      default:
        return null;
    }
  }, [envelope, scenarioType, developers, hoursToRemove, weeksToExtend]);

  if (!isOpen || !envelope) return null;

  const getDeltaClass = (value) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  };

  const formatDelta = (value, suffix = '') => {
    if (value === 0) return '0' + suffix;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${suffix}`;
  };

  return (
    <div className="what-if-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0 }}>What-If Scenarios</h4>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#5E6C84'
          }}
        >
          &times;
        </button>
      </div>

      {/* Scenario Type Selector */}
      <div className="what-if-scenario">
        <label>Scenario Type</label>
        <select
          value={scenarioType}
          onChange={(e) => setScenarioType(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '2px solid #DFE1E6',
            fontSize: '13px'
          }}
        >
          <option value="add_capacity">Add Capacity (more developers)</option>
          <option value="remove_scope">Remove Scope (cut issues)</option>
          <option value="extend_deadline">Extend Deadline</option>
        </select>
      </div>

      {/* Scenario-specific inputs */}
      {scenarioType === 'add_capacity' && (
        <div className="what-if-scenario">
          <label>Number of developers to add</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setDevelopers(Math.max(1, developers - 1))}
              style={{
                padding: '6px 12px',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
                background: '#F4F5F7',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <input
              type="number"
              value={developers}
              onChange={(e) => setDevelopers(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              style={{
                width: '60px',
                padding: '6px',
                textAlign: 'center',
                border: '2px solid #DFE1E6',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={() => setDevelopers(developers + 1)}
              style={{
                padding: '6px 12px',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
                background: '#F4F5F7',
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <span style={{ color: '#5E6C84', fontSize: '12px' }}>
              (@ 6h/day each)
            </span>
          </div>
        </div>
      )}

      {scenarioType === 'remove_scope' && (
        <div className="what-if-scenario">
          <label>Hours of scope to remove</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max={Math.round(envelope.totals.totalDemand)}
              value={hoursToRemove}
              onChange={(e) => setHoursToRemove(parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              value={hoursToRemove}
              onChange={(e) => setHoursToRemove(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max={Math.round(envelope.totals.totalDemand)}
              style={{
                width: '60px',
                padding: '6px',
                textAlign: 'center',
                border: '2px solid #DFE1E6',
                borderRadius: '4px'
              }}
            />
            <span style={{ color: '#5E6C84' }}>hours</span>
          </div>
          <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: '4px' }}>
            Current total demand: {envelope.totals.totalDemand.toFixed(1)}h
          </div>
        </div>
      )}

      {scenarioType === 'extend_deadline' && (
        <div className="what-if-scenario">
          <label>Weeks to extend deadline</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setWeeksToExtend(Math.max(1, weeksToExtend - 1))}
              style={{
                padding: '6px 12px',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
                background: '#F4F5F7',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <input
              type="number"
              value={weeksToExtend}
              onChange={(e) => setWeeksToExtend(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              style={{
                width: '60px',
                padding: '6px',
                textAlign: 'center',
                border: '2px solid #DFE1E6',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={() => setWeeksToExtend(weeksToExtend + 1)}
              style={{
                padding: '6px 12px',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
                background: '#F4F5F7',
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <span style={{ color: '#5E6C84' }}>week{weeksToExtend !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {scenarioResult && (
        <div className="what-if-result">
          <div style={{ marginBottom: '12px', fontWeight: 600, color: '#172B4D' }}>
            {scenarioResult.description}
          </div>

          {/* Feasibility Score Change */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#5E6C84' }}>Feasibility Score:</span>
            <div>
              <span style={{ color: '#5E6C84' }}>{scenarioResult.original.feasibilityScore}%</span>
              <span style={{ margin: '0 8px', color: '#5E6C84' }}>→</span>
              <span style={{
                fontWeight: 600,
                color: scenarioResult.result.feasibilityScore >= 80 ? '#00875A' :
                       scenarioResult.result.feasibilityScore >= 50 ? '#FF8B00' : '#DE350B'
              }}>
                {scenarioResult.result.feasibilityScore}%
              </span>
              <span className={`what-if-delta ${getDeltaClass(scenarioResult.delta.feasibilityScore)}`} style={{ marginLeft: '8px' }}>
                ({formatDelta(scenarioResult.delta.feasibilityScore, '%')})
              </span>
            </div>
          </div>

          {/* Forecast Change */}
          {scenarioResult.original.forecastExtraDays > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#5E6C84' }}>Days After Deadline:</span>
              <div>
                <span style={{ color: '#5E6C84' }}>{scenarioResult.original.forecastExtraDays}</span>
                <span style={{ margin: '0 8px', color: '#5E6C84' }}>→</span>
                <span style={{
                  fontWeight: 600,
                  color: scenarioResult.result.forecastExtraDays === 0 ? '#00875A' : '#DE350B'
                }}>
                  {scenarioResult.result.forecastExtraDays}
                </span>
                <span className={`what-if-delta ${getDeltaClass(-scenarioResult.delta.forecastExtraDays)}`} style={{ marginLeft: '8px' }}>
                  ({formatDelta(scenarioResult.delta.forecastExtraDays, ' days')})
                </span>
              </div>
            </div>
          )}

          {/* Capacity/Demand Change */}
          {scenarioType === 'add_capacity' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5E6C84' }}>Additional Capacity:</span>
              <span style={{ fontWeight: 600, color: '#00875A' }}>
                +{scenarioResult.delta.capacity.toFixed(1)}h
              </span>
            </div>
          )}

          {scenarioType === 'remove_scope' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5E6C84' }}>Demand Reduced:</span>
              <span style={{ fontWeight: 600, color: '#00875A' }}>
                {scenarioResult.delta.demand}h
              </span>
            </div>
          )}

          {scenarioType === 'extend_deadline' && scenarioResult.delta.bufferGained && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#5E6C84' }}>Buffer Gained:</span>
              <span style={{ fontWeight: 600, color: '#00875A' }}>
                +{scenarioResult.delta.bufferGained.toFixed(1)}h
              </span>
            </div>
          )}
        </div>
      )}

      {/* Summary Message */}
      {scenarioResult && scenarioResult.delta.feasibilityScore > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#E3FCEF',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#00875A'
        }}>
          This change would improve your feasibility by {scenarioResult.delta.feasibilityScore}%
        </div>
      )}
    </div>
  );
}

export default WhatIfPanel;
