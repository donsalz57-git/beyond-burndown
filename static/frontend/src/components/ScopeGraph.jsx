import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

/**
 * ScopeGraph - Visualizes scope over time (original, current, completed, remaining)
 */
function ScopeGraph({ scopeTimeline, totals }) {
  // State for interactive legend
  const [visibleAreas, setVisibleAreas] = useState({
    originalScope: true,
    currentScope: true,
    completedScope: true,
    remainingScope: true
  });

  const handleLegendClick = (dataKey) => {
    setVisibleAreas(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  if (!scopeTimeline || scopeTimeline.length === 0) {
    return (
      <div className="empty-state">
        <h4>No scope data available</h4>
        <p>No timeline data to visualize.</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = scopeTimeline.map(item => ({
    date: item.displayDate,
    originalScope: visibleAreas.originalScope ? item.originalScope : null,
    currentScope: visibleAreas.currentScope ? item.currentScope : null,
    completedScope: visibleAreas.completedScope ? item.completedScope : null,
    remainingScope: visibleAreas.remainingScope ? item.remainingScope : null
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #DFE1E6',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleAreas.originalScope && (
            <div>
              <span style={{ color: '#5E6C84' }}>Original Scope: </span>
              <strong>{data.originalScope?.toFixed(1) || 0}h</strong>
            </div>
          )}
          {visibleAreas.currentScope && (
            <div>
              <span style={{ color: '#5E6C84' }}>Current Scope: </span>
              <strong style={{ color: '#0052CC' }}>{data.currentScope?.toFixed(1) || 0}h</strong>
            </div>
          )}
          {visibleAreas.completedScope && (
            <div>
              <span style={{ color: '#5E6C84' }}>Completed: </span>
              <strong style={{ color: '#00875A' }}>{data.completedScope?.toFixed(1) || 0}h</strong>
            </div>
          )}
          {visibleAreas.remainingScope && (
            <div>
              <span style={{ color: '#5E6C84' }}>Remaining: </span>
              <strong style={{ color: '#FF8B00' }}>{data.remainingScope?.toFixed(1) || 0}h</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  const legendItems = [
    { key: 'originalScope', label: 'Original Scope', color: '#DFE1E6' },
    { key: 'currentScope', label: 'Current Scope', color: '#0052CC' },
    { key: 'completedScope', label: 'Completed', color: '#00875A' },
    { key: 'remainingScope', label: 'Remaining', color: '#FF8B00' }
  ];

  return (
    <div className="scope-graph-container">
      {/* Summary */}
      {totals && (
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '12px 16px',
          background: '#F4F5F7',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#5E6C84' }}>
              {totals.originalScope.toFixed(1)}h
            </div>
            <div style={{ fontSize: '11px', color: '#5E6C84' }}>Original</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0052CC' }}>
              {totals.currentScope.toFixed(1)}h
            </div>
            <div style={{ fontSize: '11px', color: '#5E6C84' }}>Current</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#00875A' }}>
              {totals.completedScope.toFixed(1)}h
            </div>
            <div style={{ fontSize: '11px', color: '#5E6C84' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#FF8B00' }}>
              {totals.remainingScope.toFixed(1)}h
            </div>
            <div style={{ fontSize: '11px', color: '#5E6C84' }}>Remaining</div>
          </div>
          {totals.currentScope > totals.originalScope && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#DE350B' }}>
                +{(totals.currentScope - totals.originalScope).toFixed(1)}h
              </div>
              <div style={{ fontSize: '11px', color: '#DE350B' }}>Scope Creep</div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#5E6C84' }}
            tickLine={{ stroke: '#DFE1E6' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#5E6C84' }}
            tickLine={{ stroke: '#DFE1E6' }}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#5E6C84' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {visibleAreas.originalScope && (
            <Area
              type="monotone"
              dataKey="originalScope"
              stroke="#5E6C84"
              fill="#DFE1E6"
              fillOpacity={0.5}
              name="Original Scope"
            />
          )}

          {visibleAreas.currentScope && (
            <Line
              type="monotone"
              dataKey="currentScope"
              stroke="#0052CC"
              strokeWidth={2}
              dot={false}
              name="Current Scope"
            />
          )}

          {visibleAreas.completedScope && (
            <Area
              type="monotone"
              dataKey="completedScope"
              stroke="#00875A"
              fill="#E3FCEF"
              fillOpacity={0.8}
              name="Completed"
            />
          )}

          {visibleAreas.remainingScope && (
            <Line
              type="monotone"
              dataKey="remainingScope"
              stroke="#FF8B00"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Remaining"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Interactive Legend */}
      <div className="chart-legend interactive" style={{ marginTop: '16px' }}>
        {legendItems.map(item => (
          <div
            key={item.key}
            className={`legend-item ${!visibleAreas[item.key] ? 'hidden' : ''}`}
            onClick={() => handleLegendClick(item.key)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div
              className="legend-color"
              style={{
                background: visibleAreas[item.key] ? item.color : '#ccc'
              }}
            />
            <span style={{
              textDecoration: visibleAreas[item.key] ? 'none' : 'line-through',
              color: visibleAreas[item.key] ? '#172B4D' : '#999'
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#5E6C84', textAlign: 'center' }}>
        Click legend items to show/hide
      </div>
    </div>
  );
}

export default ScopeGraph;
