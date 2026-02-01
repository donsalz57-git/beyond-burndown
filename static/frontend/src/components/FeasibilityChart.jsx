import React, { useState, useMemo } from 'react';
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

const PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
};

const PERIOD_LABELS = {
  [PERIODS.DAILY]: 'Daily',
  [PERIODS.WEEKLY]: 'Weekly',
  [PERIODS.BIWEEKLY]: 'Bi-weekly',
  [PERIODS.MONTHLY]: 'Monthly',
  [PERIODS.QUARTERLY]: 'Quarterly'
};

/**
 * Aggregate daily timeline data into larger periods
 */
function aggregateTimeline(timeline, period) {
  if (period === PERIODS.DAILY || !timeline || timeline.length === 0) {
    return timeline;
  }

  const groups = new Map();

  for (const day of timeline) {
    const date = new Date(day.date);
    let groupKey;
    let groupLabel;

    switch (period) {
      case PERIODS.WEEKLY: {
        // Group by week (starting Monday)
        const weekStart = new Date(date);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(date.getDate() + diff);
        groupKey = weekStart.toISOString().split('T')[0];
        groupLabel = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        break;
      }
      case PERIODS.BIWEEKLY: {
        // Group by bi-weekly periods (2-week chunks from start)
        const weekStart = new Date(date);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(date.getDate() + diff);
        // Get week number and group by even/odd weeks
        const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((weekStart - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
        const biweekNum = Math.floor(weekNum / 2);
        groupKey = `${weekStart.getFullYear()}-BW${biweekNum}`;
        groupLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 2wk`;
        break;
      }
      case PERIODS.MONTHLY: {
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        groupLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        break;
      }
      case PERIODS.QUARTERLY: {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        groupKey = `${date.getFullYear()}-Q${quarter}`;
        groupLabel = `Q${quarter} ${date.getFullYear()}`;
        break;
      }
      default:
        groupKey = day.date;
        groupLabel = day.displayDate;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        groupLabel,
        days: [],
        capacity: 0,
        demand: 0,
        originalEstimate: 0,
        timeSpent: 0
      });
    }

    const group = groups.get(groupKey);
    group.days.push(day);
    group.capacity += day.capacity || 0;
    group.demand += day.demand || 0;
    group.originalEstimate += day.originalEstimate || 0;
    group.timeSpent += day.timeSpent || 0;
  }

  // Convert to array and calculate cumulative values
  const result = [];
  let cumulativeCapacity = 0;
  let cumulativeDemand = 0;
  let cumulativeOriginalEstimate = 0;
  let cumulativeTimeSpent = 0;

  for (const [, group] of groups) {
    cumulativeCapacity += group.capacity;
    cumulativeDemand += group.demand;
    cumulativeOriginalEstimate += group.originalEstimate;
    cumulativeTimeSpent += group.timeSpent;

    const overload = cumulativeDemand - cumulativeCapacity;

    // Calculate completion percentage
    const completionPercent = cumulativeOriginalEstimate > 0
      ? Math.round((cumulativeTimeSpent / cumulativeOriginalEstimate) * 100)
      : 0;

    result.push({
      date: group.groupKey,
      displayDate: group.groupLabel,
      capacity: Math.round(group.capacity * 100) / 100,
      demand: Math.round(group.demand * 100) / 100,
      originalEstimate: Math.round(group.originalEstimate * 100) / 100,
      timeSpent: Math.round(group.timeSpent * 100) / 100,
      cumulativeCapacity: Math.round(cumulativeCapacity * 100) / 100,
      cumulativeDemand: Math.round(cumulativeDemand * 100) / 100,
      cumulativeOriginalEstimate: Math.round(cumulativeOriginalEstimate * 100) / 100,
      cumulativeTimeSpent: Math.round(cumulativeTimeSpent * 100) / 100,
      completionPercent,
      overload: Math.round(Math.max(0, overload) * 100) / 100,
      isOverloaded: overload > 0,
      daysInPeriod: group.days.length
    });
  }

  return result;
}

function FeasibilityChart({ envelope }) {
  const [period, setPeriod] = useState(PERIODS.DAILY);

  // State for interactive legend - track which lines are visible
  const [visibleLines, setVisibleLines] = useState({
    periodCapacity: true,
    periodDemand: true,
    capacity: true,
    demand: true,
    timeSpent: true,
    completionPercent: true,
    forecastCapacity: true
  });

  // Toggle line visibility
  const handleLegendClick = (dataKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  if (!envelope || !envelope.timeline || envelope.timeline.length === 0) {
    return (
      <div className="empty-state">
        <h4>No data available</h4>
        <p>No issues with dates and estimates found in the configured JQL query.</p>
      </div>
    );
  }

  const { timeline, overloadedPeriods, feasibilityScore, totals, forecast } = envelope;

  // Aggregate timeline based on selected period
  const aggregatedTimeline = useMemo(
    () => aggregateTimeline(timeline, period),
    [timeline, period]
  );

  // Prepare chart data from aggregated timeline
  const chartData = useMemo(() => {
    const data = aggregatedTimeline.map(item => ({
      date: item.displayDate,
      fullDate: item.date,
      capacity: item.cumulativeCapacity,
      demand: item.cumulativeDemand,
      periodCapacity: item.capacity,
      periodDemand: item.demand,
      periodOriginalEstimate: item.originalEstimate,
      cumulativeOriginalEstimate: item.cumulativeOriginalEstimate || 0,
      timeSpent: item.cumulativeTimeSpent || 0,
      completionPercent: item.completionPercent || 0,
      overload: item.overload,
      isOverloaded: item.isOverloaded,
      daysInPeriod: item.daysInPeriod || 1,
      forecastCapacity: null // Will be set for forecast points
    }));

    // Add forecast extension points if there's a gap
    if (forecast && forecast.extraDays > 0 && data.length > 0) {
      const lastPoint = data[data.length - 1];
      const avgDailyCapacity = forecast.avgDailyCapacity || (totals.totalCapacity / totals.totalDays);

      // Mark the last point as the forecast start
      lastPoint.forecastCapacity = lastPoint.capacity;

      // Add forecast endpoint
      const forecastDate = new Date(forecast.forecastDate);
      data.push({
        date: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: forecast.forecastDate,
        capacity: null, // Don't continue regular capacity
        demand: lastPoint.demand, // Demand stays flat
        periodCapacity: null,
        periodDemand: null,
        periodOriginalEstimate: null,
        cumulativeOriginalEstimate: lastPoint.cumulativeOriginalEstimate,
        timeSpent: null,
        completionPercent: null,
        overload: null,
        isOverloaded: false,
        daysInPeriod: null,
        forecastCapacity: lastPoint.demand, // Capacity extends to meet demand
        isForecast: true
      });
    }

    return data;
  }, [aggregatedTimeline, forecast, totals]);

  // Dynamic labels based on period
  const periodLabel = period === PERIODS.DAILY ? 'Daily' : PERIOD_LABELS[period];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const capacityLabel = period === PERIODS.DAILY ? 'Daily' : periodLabel;
    const demandLabel = period === PERIODS.DAILY ? 'Daily' : periodLabel;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #DFE1E6',
        borderRadius: '4px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{label}</div>
        {period !== PERIODS.DAILY && data.daysInPeriod && (
          <div style={{ fontSize: '11px', color: '#5E6C84', marginBottom: '8px' }}>
            ({data.daysInPeriod} business days)
          </div>
        )}
        <div style={{ fontSize: '13px', color: '#5E6C84' }}>
          <div>{capacityLabel} Capacity: <strong style={{ color: '#00875A' }}>{data.periodCapacity}h</strong></div>
          <div>{demandLabel} Demand: <strong style={{ color: '#0052CC' }}>{data.periodDemand}h</strong></div>
          <div style={{ marginTop: '4px', borderTop: '1px solid #DFE1E6', paddingTop: '4px' }}>
            <div>Cumulative Capacity: {data.capacity}h</div>
            <div>Cumulative Demand: {data.demand}h</div>
            <div>Cumulative Original Estimate: {data.cumulativeOriginalEstimate}h</div>
            <div>Cumulative Time Spent: <strong style={{ color: '#FF8B00' }}>{data.timeSpent}h</strong></div>
          </div>
          <div style={{ marginTop: '4px', borderTop: '1px solid #DFE1E6', paddingTop: '4px' }}>
            <div>Completion: <strong style={{ color: '#9C27B0' }}>{data.completionPercent}%</strong></div>
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
      {/* Header with Feasibility Score and Period Selector */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#5E6C84' }}>
            {totals.totalDemand.toFixed(1)}h demand / {totals.totalCapacity.toFixed(1)}h capacity / {(totals.totalTimeSpent || 0).toFixed(1)}h spent
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '2px solid #DFE1E6',
              fontSize: '13px',
              color: '#172B4D',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#5E6C84' }}
              tickLine={{ stroke: '#DFE1E6' }}
              label={{ value: period === PERIODS.DAILY ? 'Hours/Day' : `Hours/${periodLabel}`, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#5E6C84' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#5E6C84' }}
              tickLine={{ stroke: '#DFE1E6' }}
              domain={[0, 100]}
              label={{ value: 'Completion %', angle: 90, position: 'insideRight', fontSize: 11, fill: '#9C27B0' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Period Capacity line */}
            {visibleLines.periodCapacity && (
              <Line
                type="monotone"
                dataKey="periodCapacity"
                stroke="#00875A"
                strokeWidth={2}
                dot={false}
                yAxisId="left"
                name={`${periodLabel} Capacity`}
                connectNulls={false}
              />
            )}

            {/* Period Demand line */}
            {visibleLines.periodDemand && (
              <Line
                type="monotone"
                dataKey="periodDemand"
                stroke="#0052CC"
                strokeWidth={2}
                dot={false}
                yAxisId="left"
                name={`${periodLabel} Demand`}
                connectNulls={false}
              />
            )}

            {/* Cumulative Capacity line */}
            {visibleLines.capacity && (
              <Line
                type="monotone"
                dataKey="capacity"
                stroke="#00875A"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                yAxisId="left"
                name="Cumulative Capacity"
                connectNulls={false}
              />
            )}

            {/* Cumulative Demand line */}
            {visibleLines.demand && (
              <Line
                type="monotone"
                dataKey="demand"
                stroke="#0052CC"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                yAxisId="left"
                name="Cumulative Demand"
                connectNulls={true}
              />
            )}

            {/* Cumulative Time Spent line */}
            {visibleLines.timeSpent && (
              <Line
                type="monotone"
                dataKey="timeSpent"
                stroke="#FF8B00"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                yAxisId="left"
                name="Time Spent"
                connectNulls={false}
              />
            )}

            {/* Completion Percentage line */}
            {visibleLines.completionPercent && (
              <Line
                type="monotone"
                dataKey="completionPercent"
                stroke="#9C27B0"
                strokeWidth={2}
                dot={false}
                yAxisId="right"
                name="Completion %"
                connectNulls={false}
              />
            )}

            {/* Forecast Capacity Extension line */}
            {visibleLines.forecastCapacity && forecast?.extraDays > 0 && (
              <Line
                type="monotone"
                dataKey="forecastCapacity"
                stroke="#00875A"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={false}
                yAxisId="left"
                name="Forecast Extension"
                connectNulls={true}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend */}
      <div className="chart-legend interactive" style={{ marginTop: '16px' }}>
        <div
          className={`legend-item ${!visibleLines.periodCapacity ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('periodCapacity')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.periodCapacity ? '#00875A' : '#ccc'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.periodCapacity ? 'none' : 'line-through',
            color: visibleLines.periodCapacity ? '#172B4D' : '#999'
          }}>{periodLabel} Capacity</span>
        </div>
        <div
          className={`legend-item ${!visibleLines.periodDemand ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('periodDemand')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.periodDemand ? '#0052CC' : '#ccc'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.periodDemand ? 'none' : 'line-through',
            color: visibleLines.periodDemand ? '#172B4D' : '#999'
          }}>{periodLabel} Demand</span>
        </div>
        <div
          className={`legend-item ${!visibleLines.capacity ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('capacity')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.capacity ? '#00875A' : '#ccc',
              borderStyle: 'dashed'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.capacity ? 'none' : 'line-through',
            color: visibleLines.capacity ? '#172B4D' : '#999'
          }}>Cumulative Capacity</span>
        </div>
        <div
          className={`legend-item ${!visibleLines.demand ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('demand')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.demand ? '#0052CC' : '#ccc',
              borderStyle: 'dashed'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.demand ? 'none' : 'line-through',
            color: visibleLines.demand ? '#172B4D' : '#999'
          }}>Cumulative Demand</span>
        </div>
        <div
          className={`legend-item ${!visibleLines.timeSpent ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('timeSpent')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.timeSpent ? '#FF8B00' : '#ccc',
              borderStyle: 'dashed'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.timeSpent ? 'none' : 'line-through',
            color: visibleLines.timeSpent ? '#172B4D' : '#999'
          }}>Cumulative Time Spent</span>
        </div>
        <div
          className={`legend-item ${!visibleLines.completionPercent ? 'hidden' : ''}`}
          onClick={() => handleLegendClick('completionPercent')}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div
            className="legend-color"
            style={{
              background: visibleLines.completionPercent ? '#9C27B0' : '#ccc'
            }}
          ></div>
          <span style={{
            textDecoration: visibleLines.completionPercent ? 'none' : 'line-through',
            color: visibleLines.completionPercent ? '#172B4D' : '#999'
          }}>Completion %</span>
        </div>
        {forecast?.extraDays > 0 && (
          <div
            className={`legend-item ${!visibleLines.forecastCapacity ? 'hidden' : ''}`}
            onClick={() => handleLegendClick('forecastCapacity')}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div
              className="legend-color"
              style={{
                background: visibleLines.forecastCapacity ? '#00875A' : '#ccc',
                borderStyle: 'dashed',
                borderWidth: '2px'
              }}
            ></div>
            <span style={{
              textDecoration: visibleLines.forecastCapacity ? 'none' : 'line-through',
              color: visibleLines.forecastCapacity ? '#172B4D' : '#999'
            }}>Forecast Extension</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#5E6C84', textAlign: 'center' }}>
        Click legend items to show/hide
      </div>
    </div>
  );
}

export default FeasibilityChart;
