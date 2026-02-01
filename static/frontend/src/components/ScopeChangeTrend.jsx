import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

/**
 * ScopeChangeTrend - Shows weekly scope changes (added, removed, net)
 */
function ScopeChangeTrend({ trend, alerts }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="empty-state">
        <h4>No trend data available</h4>
        <p>No weekly scope changes to display.</p>
      </div>
    );
  }

  // Prepare chart data with colored bars
  const chartData = trend.map(week => ({
    ...week,
    positiveChange: week.netChange > 0 ? week.netChange : 0,
    negativeChange: week.netChange < 0 ? week.netChange : 0
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
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Week of {label}</div>
        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: '#5E6C84' }}>Added: </span>
            <strong style={{ color: '#DE350B' }}>+{data.added}h</strong>
            <span style={{ color: '#5E6C84', marginLeft: '4px' }}>({data.addedCount} issues)</span>
          </div>
          <div>
            <span style={{ color: '#5E6C84' }}>Removed: </span>
            <strong style={{ color: '#00875A' }}>-{data.removed}h</strong>
            <span style={{ color: '#5E6C84', marginLeft: '4px' }}>({data.removedCount} issues)</span>
          </div>
          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #DFE1E6' }}>
            <span style={{ color: '#5E6C84' }}>Net Change: </span>
            <strong style={{ color: data.netChange > 0 ? '#DE350B' : data.netChange < 0 ? '#00875A' : '#172B4D' }}>
              {data.netChange > 0 ? '+' : ''}{data.netChange}h
            </strong>
          </div>
          <div>
            <span style={{ color: '#5E6C84' }}>Total Scope: </span>
            <strong>{data.totalScope}h</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px 12px',
                background: alert.severity === 'error' ? '#FFEBE6' : '#FFFAE6',
                borderLeft: `4px solid ${alert.severity === 'error' ? '#DE350B' : '#FF8B00'}`,
                borderRadius: '4px',
                marginBottom: '8px',
                fontSize: '13px'
              }}
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', color: '#172B4D' }}>
          Weekly Net Change
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: '#5E6C84' }}
              tickLine={{ stroke: '#DFE1E6' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#5E6C84' }}
              tickLine={{ stroke: '#DFE1E6' }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#5E6C84' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#172B4D" strokeWidth={1} />

            {/* Positive changes (scope growth) in red */}
            <Bar
              dataKey="positiveChange"
              fill="#DE350B"
              name="Scope Added"
            />

            {/* Negative changes (scope reduction) in green */}
            <Bar
              dataKey="negativeChange"
              fill="#00875A"
              name="Scope Removed"
            />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#5E6C84', marginTop: '8px' }}>
          <span style={{ color: '#DE350B' }}>Red = scope growth</span>
          {' | '}
          <span style={{ color: '#00875A' }}>Green = scope reduction</span>
        </div>
      </div>

      {/* Table */}
      <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', color: '#172B4D' }}>
        Weekly Breakdown
      </h4>
      <table className="scope-trend-table">
        <thead>
          <tr>
            <th>Week</th>
            <th style={{ textAlign: 'right' }}>Added</th>
            <th style={{ textAlign: 'right' }}>Removed</th>
            <th style={{ textAlign: 'right' }}>Net Change</th>
            <th style={{ textAlign: 'right' }}>Total Scope</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((week, idx) => (
            <tr key={idx}>
              <td>{week.weekLabel}</td>
              <td style={{ textAlign: 'right' }}>
                <span style={{ color: '#DE350B' }}>+{week.added}h</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span style={{ color: '#00875A' }}>-{week.removed}h</span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className={week.netChange > 0 ? 'scope-change-positive' : week.netChange < 0 ? 'scope-change-negative' : ''}>
                  {week.netChange > 0 ? '+' : ''}{week.netChange}h
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>{week.totalScope}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScopeChangeTrend;
