import React, { useState, useMemo, useEffect } from 'react';

/**
 * WhatIfPanel - Scenario modeling UI for what-if analysis
 * Supports multiple scenarios that can be applied/removed individually
 */
const EMPTY_SCENARIOS = [];

function WhatIfPanel({ envelope, isOpen, onClose, appliedScenarios, onUpdateScenarios }) {
  const scenarios = appliedScenarios || EMPTY_SCENARIOS;
  const [scenarioType, setScenarioType] = useState('add_capacity');

  // Capacity state
  const [developers, setDevelopers] = useState(1);
  const [hoursPerDev, setHoursPerDev] = useState(8);
  const [capacityChangeType, setCapacityChangeType] = useState('add'); // 'add' or 'remove'

  // Scope change state (positive = add, negative = remove)
  const [scopeChange, setScopeChange] = useState(-20);
  const [scopeChangeType, setScopeChangeType] = useState('remove'); // 'add' or 'remove'

  // Deadline state
  const [deadlineDate, setDeadlineDate] = useState('');

  // Initialize deadline date from envelope (only once when envelope loads)
  useEffect(() => {
    if (envelope?.timeline?.length > 0) {
      const lastDay = envelope.timeline[envelope.timeline.length - 1];
      const lastDate = new Date(lastDay.date);
      lastDate.setDate(lastDate.getDate() + 7); // Default to 1 week after current end
      setDeadlineDate(prev => prev || lastDate.toISOString().split('T')[0]);
    }
  }, [envelope]);

  // Calculate current end date from envelope
  const currentEndDate = useMemo(() => {
    if (!envelope?.timeline?.length) return null;
    const lastDay = envelope.timeline[envelope.timeline.length - 1];
    return new Date(lastDay.date);
  }, [envelope]);

  // Calculate scenario preview
  const scenarioPreview = useMemo(() => {
    if (!envelope) return null;

    const { totals, timeline, feasibilityScore, forecast } = envelope;

    switch (scenarioType) {
      case 'add_capacity': {
        const capacityChange = developers * hoursPerDev * totals.totalDays;
        const actualChange = capacityChangeType === 'remove' ? -capacityChange : capacityChange;
        const newCapacity = Math.max(0, totals.totalCapacity + actualChange);
        const newFeasibility = totals.totalDemand > 0
          ? Math.round(Math.min(100, (newCapacity / totals.totalDemand) * 100))
          : 100;
        return {
          id: `cap-${Date.now()}`,
          type: 'add_capacity',
          description: capacityChangeType === 'remove'
            ? `-${developers} dev${developers > 1 ? 's' : ''} @ ${hoursPerDev}h/day`
            : `+${developers} dev${developers > 1 ? 's' : ''} @ ${hoursPerDev}h/day`,
          color: capacityChangeType === 'remove' ? '#DE350B' : '#00875A',
          delta: {
            capacity: actualChange,
            demand: 0,
            days: 0
          },
          result: {
            feasibilityScore: newFeasibility,
            capacityChange: actualChange
          }
        };
      }
      case 'change_scope': {
        const change = scopeChangeType === 'remove' ? -Math.abs(scopeChange) : Math.abs(scopeChange);
        const newDemand = Math.max(0, totals.totalDemand + change);
        const newFeasibility = Math.round(Math.min(100, (totals.totalCapacity / newDemand) * 100));
        return {
          id: `scope-${Date.now()}`,
          type: 'change_scope',
          description: `${change >= 0 ? '+' : ''}${change}h scope`,
          color: change < 0 ? '#00875A' : '#DE350B',
          delta: {
            capacity: 0,
            demand: change,
            days: 0
          },
          result: {
            feasibilityScore: newFeasibility,
            demandChange: change
          }
        };
      }
      case 'change_deadline': {
        if (!deadlineDate || !currentEndDate) return null;
        const newEnd = new Date(deadlineDate);
        const daysDiff = Math.round((newEnd - currentEndDate) / (1000 * 60 * 60 * 24));
        const businessDays = Math.round(daysDiff * 5 / 7); // Rough business day conversion
        const avgDailyCapacity = totals.totalDays > 0 ? totals.totalCapacity / totals.totalDays : 0;
        const additionalCapacity = avgDailyCapacity * businessDays;
        const newCapacity = totals.totalCapacity + additionalCapacity;
        const newFeasibility = Math.round(Math.min(100, (newCapacity / totals.totalDemand) * 100));
        return {
          id: `deadline-${Date.now()}`,
          type: 'change_deadline',
          description: `Deadline ${daysDiff >= 0 ? '+' : ''}${daysDiff} days`,
          color: daysDiff > 0 ? '#00875A' : '#DE350B',
          delta: {
            capacity: additionalCapacity,
            demand: 0,
            days: businessDays
          },
          result: {
            feasibilityScore: newFeasibility,
            capacityChange: additionalCapacity
          }
        };
      }
      default:
        return null;
    }
  }, [envelope, scenarioType, developers, hoursPerDev, capacityChangeType, scopeChange, scopeChangeType, deadlineDate, currentEndDate]);

  const handleAddScenario = () => {
    if (scenarioPreview && onUpdateScenarios) {
      onUpdateScenarios([...scenarios, { ...scenarioPreview, enabled: true }]);
    }
  };

  const handleToggleScenario = (id) => {
    if (onUpdateScenarios) {
      onUpdateScenarios(scenarios.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ));
    }
  };

  const handleRemoveScenario = (id) => {
    if (onUpdateScenarios) {
      onUpdateScenarios(scenarios.filter(s => s.id !== id));
    }
  };

  const handleClearAll = () => {
    if (onUpdateScenarios) {
      onUpdateScenarios([]);
    }
  };

  // Calculate combined effect of all enabled scenarios
  // IMPORTANT: This hook must be called before any conditional returns (Rules of Hooks)
  const combinedEffect = useMemo(() => {
    if (!envelope?.totals) {
      return {
        capacityChange: 0,
        demandChange: 0,
        newCapacity: 0,
        newDemand: 0,
        newFeasibility: 0,
        originalFeasibility: 0
      };
    }
    const { totals } = envelope;
    const enabled = scenarios.filter(s => s.enabled);
    const totalCapacityChange = enabled.reduce((sum, s) => sum + (s.delta.capacity || 0), 0);
    const totalDemandChange = enabled.reduce((sum, s) => sum + (s.delta.demand || 0), 0);
    const newCapacity = totals.totalCapacity + totalCapacityChange;
    const newDemand = Math.max(0, totals.totalDemand + totalDemandChange);
    const newFeasibility = newDemand > 0 ? Math.round(Math.min(100, (newCapacity / newDemand) * 100)) : 100;
    return {
      capacityChange: totalCapacityChange,
      demandChange: totalDemandChange,
      newCapacity,
      newDemand,
      newFeasibility,
      originalFeasibility: envelope.feasibilityScore
    };
  }, [scenarios, envelope]);

  if (!isOpen || !envelope) return null;

  const { totals } = envelope;

  return (
    <div className="what-if-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0 }}>What-If Scenarios</h4>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#5E6C84' }}>
          ×
        </button>
      </div>

      {/* Applied Scenarios List */}
      {scenarios.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#F4F5F7', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84' }}>Active Scenarios</span>
            <button
              onClick={handleClearAll}
              style={{ fontSize: '11px', color: '#DE350B', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear All
            </button>
          </div>
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                background: scenario.enabled ? 'white' : '#E4E6E9',
                borderRadius: '4px',
                marginBottom: '4px',
                border: `1px solid ${scenario.enabled ? scenario.color : '#DFE1E6'}`
              }}
            >
              <input
                type="checkbox"
                checked={scenario.enabled}
                onChange={() => handleToggleScenario(scenario.id)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{
                flex: 1,
                fontSize: '12px',
                color: scenario.enabled ? '#172B4D' : '#97A0AF',
                textDecoration: scenario.enabled ? 'none' : 'line-through'
              }}>
                {scenario.description}
              </span>
              <button
                onClick={() => handleRemoveScenario(scenario.id)}
                style={{ background: 'none', border: 'none', color: '#97A0AF', cursor: 'pointer', fontSize: '14px' }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Combined Effect Summary */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #DFE1E6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#5E6C84' }}>Combined Feasibility:</span>
              <span style={{ fontWeight: 600, color: combinedEffect.newFeasibility >= 80 ? '#00875A' : combinedEffect.newFeasibility >= 50 ? '#FF8B00' : '#DE350B' }}>
                {envelope.feasibilityScore}% → {combinedEffect.newFeasibility}%
              </span>
            </div>
            {combinedEffect.capacityChange !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: '#97A0AF' }}>Capacity:</span>
                <span style={{ color: combinedEffect.capacityChange > 0 ? '#00875A' : '#DE350B' }}>
                  {combinedEffect.capacityChange > 0 ? '+' : ''}{combinedEffect.capacityChange.toFixed(0)}h
                </span>
              </div>
            )}
            {combinedEffect.demandChange !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                <span style={{ color: '#97A0AF' }}>Demand:</span>
                <span style={{ color: combinedEffect.demandChange < 0 ? '#00875A' : '#DE350B' }}>
                  {combinedEffect.demandChange > 0 ? '+' : ''}{combinedEffect.demandChange.toFixed(0)}h
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Scenario */}
      <div style={{ borderTop: scenarios.length > 0 ? '1px solid #DFE1E6' : 'none', paddingTop: scenarios.length > 0 ? '16px' : '0' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#5E6C84', marginBottom: '12px' }}>Add Scenario</div>

        {/* Scenario Type Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {[
            { type: 'add_capacity', label: 'Capacity' },
            { type: 'change_scope', label: 'Scope' },
            { type: 'change_deadline', label: 'Deadline' }
          ].map(tab => (
            <button
              key={tab.type}
              onClick={() => setScenarioType(tab.type)}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: scenarioType === tab.type ? 600 : 400,
                background: scenarioType === tab.type ? '#0052CC' : '#F4F5F7',
                color: scenarioType === tab.type ? 'white' : '#5E6C84',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Capacity Controls */}
        {scenarioType === 'add_capacity' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setCapacityChangeType('add')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: `2px solid ${capacityChangeType === 'add' ? '#00875A' : '#DFE1E6'}`,
                  borderRadius: '4px',
                  background: capacityChangeType === 'add' ? '#E3FCEF' : 'white',
                  color: capacityChangeType === 'add' ? '#00875A' : '#5E6C84',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Add Capacity
              </button>
              <button
                onClick={() => setCapacityChangeType('remove')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: `2px solid ${capacityChangeType === 'remove' ? '#DE350B' : '#DFE1E6'}`,
                  borderRadius: '4px',
                  background: capacityChangeType === 'remove' ? '#FFEBE6' : 'white',
                  color: capacityChangeType === 'remove' ? '#DE350B' : '#5E6C84',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Remove Capacity
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={developers}
                onChange={(e) => setDevelopers(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>dev(s) @</span>
              <input
                type="number"
                value={hoursPerDev}
                onChange={(e) => setHoursPerDev(Math.max(1, Math.min(12, parseInt(e.target.value) || 8)))}
                min="1"
                max="12"
                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>h/day</span>
            </div>
          </div>
        )}

        {/* Change Scope Controls */}
        {scenarioType === 'change_scope' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setScopeChangeType('remove')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: `2px solid ${scopeChangeType === 'remove' ? '#00875A' : '#DFE1E6'}`,
                  borderRadius: '4px',
                  background: scopeChangeType === 'remove' ? '#E3FCEF' : 'white',
                  color: scopeChangeType === 'remove' ? '#00875A' : '#5E6C84',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Remove Scope
              </button>
              <button
                onClick={() => setScopeChangeType('add')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: `2px solid ${scopeChangeType === 'add' ? '#DE350B' : '#DFE1E6'}`,
                  borderRadius: '4px',
                  background: scopeChangeType === 'add' ? '#FFEBE6' : 'white',
                  color: scopeChangeType === 'add' ? '#DE350B' : '#5E6C84',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Add Scope
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max={Math.round(totals.totalDemand * 0.5)}
                value={Math.abs(scopeChange)}
                onChange={(e) => setScopeChange(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                value={Math.abs(scopeChange)}
                onChange={(e) => setScopeChange(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                style={{ width: '60px', padding: '6px', textAlign: 'center', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>hours</span>
            </div>
          </div>
        )}

        {/* Change Deadline Controls */}
        {scenarioType === 'change_deadline' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#5E6C84' }}>New deadline:</span>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={{ padding: '6px', border: '2px solid #DFE1E6', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>
            {currentEndDate && deadlineDate && (
              <div style={{ fontSize: '11px', color: '#5E6C84', marginTop: '8px' }}>
                Current end: {currentEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' → '}
                {new Date(deadlineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' '}
                ({Math.round((new Date(deadlineDate) - currentEndDate) / (1000 * 60 * 60 * 24))} days)
              </div>
            )}
          </div>
        )}

        {/* Preview and Add Button */}
        {scenarioPreview && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, fontSize: '12px', color: '#5E6C84' }}>
              <span style={{ color: scenarioPreview.color, fontWeight: 600 }}>{scenarioPreview.description}</span>
              {' → '}
              <span style={{ color: scenarioPreview.result.feasibilityScore >= 80 ? '#00875A' : '#FF8B00' }}>
                {scenarioPreview.result.feasibilityScore}% feasibility
              </span>
            </div>
            <button
              onClick={handleAddScenario}
              style={{
                padding: '8px 16px',
                background: '#0052CC',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatIfPanel;
