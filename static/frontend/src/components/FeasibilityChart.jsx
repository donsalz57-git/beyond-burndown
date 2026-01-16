import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

function FeasibilityChart({ envelope }) {
  if (!envelope || !envelope.timeline || envelope.timeline.length === 0) {
    return (
      <div className="empty-state">
        <h4>No data available</h4>
        <p>No issues with dates and estimates found in the configured JQL query.</p>
      </div>
    );
  }

  const { timeline, overloadedPeriods, feasibilityScore, totals } = envelope;

  // Prepare chart data
  const chartData = timeline.map(day => ({
    date: day.displayDate,
    fullDate: day.date,
    capacity: day.cumulativeCapacity,
    demand: day.cumulativeDemand,
    dailyCapacity: day.capacity,
    dailyDemand: day.demand,
    timeSpent: day.cumulativeTimeSpent || 0,
    overload: day.overload,
    isOverloaded: day.isOverloaded
  }));

  // Custom tooltip
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
        <div style={{ fontSize: '13px', color: '#5E6C84' }}>
          <div>Daily Capacity: <strong style={{ color: '#00875A' }}>{data.dailyCapacity}h</strong></div>
          <div>Daily Demand: <strong style={{ color: '#0052CC' }}>{data.dailyDemand}h</strong></div>
          <div style={{ marginTop: '4px', borderTop: '1px solid #DFE1E6', paddingTop: '4px' }}>
            <div>Cumulative Capacity: {data.capacity}h</div>
            <div>Cumulative Demand: {data.demand}h</div>
            <div>Cumulative Time Spent: <strong style={{ color: '#FF8B00' }}>{data.timeSpent}h</strong></div>
          </div>
          {data.isOverloaded && (
            <div style={{ color: '#DE350B', marginTop: '4px' }}>
              Overloaded by {data.overload}h
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Feasibility Score */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <span style={{ fontSize: '14px', color: '#5E6C84' }}>Feasibility Score: </span>
          <span style={{
            fontSize: '24px',
            fontWeight: '600',
            color: feasibilityScore < 50 ? '#DE350B' : feasibilityScore < 80 ? '#FF8B00' : '#00875A'
          }}>
            {feasibilityScore}%
          </span>
        </div>
        <div style={{ fontSize: '13px', color: '#5E6C84' }}>
          {totals.totalDemand.toFixed(1)}h demand / {totals.totalCapacity.toFixed(1)}h capacity / {(totals.totalTimeSpent || 0).toFixed(1)}h spent
        </div>
      </div>

      {/* Overloaded Periods Warning */}
      {overloadedPeriods.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {overloadedPeriods.map((period, idx) => (
            <div key={idx} className="overloaded-period">
              <strong>Overloaded: </strong>
              {period.startDate === period.endDate
                ? period.startDate
                : `${period.startDate} to ${period.endDate}`}
              {' '}({period.days} day{period.days !== 1 ? 's' : ''}, max {period.maxOverload}h over capacity)
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              label={{ value: 'Hours/Day', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#5E6C84' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Daily Capacity line */}
            <Line
              type="monotone"
              dataKey="dailyCapacity"
              stroke="#00875A"
              strokeWidth={2}
              dot={false}
              name="Daily Capacity"
            />

            {/* Daily Demand line */}
            <Line
              type="monotone"
              dataKey="dailyDemand"
              stroke="#0052CC"
              strokeWidth={2}
              dot={false}
              name="Daily Demand"
            />

            {/* Cumulative Capacity line */}
            <Line
              type="monotone"
              dataKey="capacity"
              stroke="#00875A"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Cumulative Capacity"
            />

            {/* Cumulative Demand line */}
            <Line
              type="monotone"
              dataKey="demand"
              stroke="#0052CC"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Cumulative Demand"
            />

            {/* Cumulative Time Spent line */}
            <Line
              type="monotone"
              dataKey="timeSpent"
              stroke="#FF8B00"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Time Spent"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="chart-legend" style={{ marginTop: '48px' }}>
        <div className="legend-item">
          <div className="legend-color capacity"></div>
          <span>Daily Capacity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color demand"></div>
          <span>Daily Demand</span>
        </div>
        <div className="legend-item">
          <div className="legend-color capacity" style={{ borderStyle: 'dashed' }}></div>
          <span>Cumulative Capacity</span>
        </div>
        <div className="legend-item">
          <div className="legend-color demand" style={{ borderStyle: 'dashed' }}></div>
          <span>Cumulative Demand</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#FF8B00', borderStyle: 'dashed' }}></div>
          <span>Cumulative Time Spent</span>
        </div>
      </div>
    </div>
  );
}

export default FeasibilityChart;
