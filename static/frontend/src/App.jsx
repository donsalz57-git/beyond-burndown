import React, { useState, useEffect, Component } from 'react';
import { view } from '@forge/bridge';
import { useGadgetData } from './hooks/useGadgetData';
import FeasibilityChart from './components/FeasibilityChart';
import CompliancePanel from './components/CompliancePanel';
import DependencyView from './components/DependencyView';
import ConfigPanel from './components/ConfigPanel';
import ConfidenceIndicator from './components/ConfidenceIndicator';
import TeamHealthView from './components/TeamHealthView';
import WhatIfPanel from './components/WhatIfPanel';
import ScopeGraph from './components/ScopeGraph';
import ScopeChangeTrend from './components/ScopeChangeTrend';
import StatusReport from './components/StatusReport';
import ExportMenu from './components/ExportMenu';
import './App.css';

// Error boundary to catch rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', color: '#DE350B' }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message || 'Unknown error'}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const TABS = {
  FEASIBILITY: 'feasibility',
  SCOPE: 'scope',
  TEAM: 'team',
  COMPLIANCE: 'compliance',
  DEPENDENCIES: 'dependencies',
  REPORT: 'report'
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.FEASIBILITY);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const { data, loading, error, config, updateConfig, refresh } = useGadgetData();

  // Detect if gadget is in edit/configure mode
  useEffect(() => {
    view.getContext().then(context => {
      setIsEditMode(context.extension?.entryPoint === 'edit');
    });
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="gadget-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing project data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="gadget-container">
        <div className="error-state">
          <h3>Error loading data</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render configuration screen when in edit mode
  if (isEditMode) {
    return (
      <div className="gadget-container">
        <ConfigPanel
          config={config}
          onSave={async (newConfig) => {
            await updateConfig(newConfig);
            // Use view.submit() to tell Jira the gadget is configured
            view.submit(newConfig);
          }}
          onCancel={() => view.close()}
        />
      </div>
    );
  }

  return (
    <div className="gadget-container">
      {/* Summary Bar */}
      {data?.summary && (
        <div className="summary-bar">
          <div className="summary-item">
            <span className="summary-value">{data.summary.totalDemandIssues}</span>
            <span className="summary-label">Issues</span>
          </div>
          <div className="summary-item">
            <span className={`summary-value ${data.summary.feasibilityScore < 50 ? 'danger' : data.summary.feasibilityScore < 80 ? 'warning' : 'success'}`}>
              {data.summary.feasibilityScore}%
            </span>
            <span className="summary-label">Feasibility</span>
          </div>
          <div className="summary-item">
            <span className={`summary-value ${data.summary.totalViolations > 0 ? 'danger' : 'success'}`}>
              {data.summary.totalViolations}
            </span>
            <span className="summary-label">Violations</span>
          </div>
          <div className="summary-item">
            <span className={`summary-value ${data.summary.circularDependencies > 0 ? 'danger' : 'success'}`}>
              {data.summary.circularDependencies}
            </span>
            <span className="summary-label">Cycles</span>
          </div>
          <div className="summary-item">
            <ConfidenceIndicator confidence={data.envelope?.confidence} />
          </div>
          <div className="summary-item" style={{ marginLeft: 'auto' }}>
            <ExportMenu data={data} />
          </div>
        </div>
      )}

      {/* Forecast Warning */}
      {data?.envelope?.forecast?.extraDays > 0 && (
        <div className="forecast-warning" style={{
          padding: '8px 12px',
          backgroundColor: data.envelope.forecast.status === 'critical' ? '#FFEBE6' :
                          data.envelope.forecast.status === 'warning' ? '#FFFAE6' : '#E3FCEF',
          borderLeft: `4px solid ${
            data.envelope.forecast.status === 'critical' ? '#DE350B' :
            data.envelope.forecast.status === 'warning' ? '#FF8B00' : '#00875A'
          }`,
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          {data.envelope.forecast.message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === TABS.FEASIBILITY ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.FEASIBILITY)}
        >
          Feasibility
        </button>
        <button
          className={`tab-button ${activeTab === TABS.SCOPE ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.SCOPE)}
        >
          Scope
          {data?.scope?.alerts?.length > 0 && (
            <span className="badge danger">{data.scope.alerts.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === TABS.TEAM ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.TEAM)}
        >
          Team
          {data?.envelope?.resources?.some(r => r.status === 'overloaded') && (
            <span className="badge danger">!</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === TABS.COMPLIANCE ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.COMPLIANCE)}
        >
          Compliance
          {data?.compliance?.summary?.total > 0 && (
            <span className="badge">{data.compliance.summary.total}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === TABS.DEPENDENCIES ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.DEPENDENCIES)}
        >
          Dependencies
          {data?.dependencies?.circularDependencies?.length > 0 && (
            <span className="badge danger">{data.dependencies.circularDependencies.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === TABS.REPORT ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.REPORT)}
        >
          Report
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === TABS.FEASIBILITY && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={() => setShowWhatIf(!showWhatIf)}
                style={{
                  padding: '6px 12px',
                  background: showWhatIf ? '#0052CC' : '#F4F5F7',
                  color: showWhatIf ? 'white' : '#172B4D',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {showWhatIf ? 'Hide' : 'Show'} What-If
              </button>
            </div>
            <FeasibilityChart envelope={data?.envelope} />
            <WhatIfPanel
              envelope={data?.envelope}
              isOpen={showWhatIf}
              onClose={() => setShowWhatIf(false)}
            />
          </div>
        )}
        {activeTab === TABS.SCOPE && (
          <div>
            <ScopeGraph
              scopeTimeline={data?.scope?.scopeTimeline}
              totals={data?.scope?.totals}
            />
            <div style={{ marginTop: '32px' }}>
              <ScopeChangeTrend
                trend={data?.scope?.trend}
                alerts={data?.scope?.alerts}
              />
            </div>
          </div>
        )}
        {activeTab === TABS.TEAM && (
          <TeamHealthView resources={data?.envelope?.resources} />
        )}
        {activeTab === TABS.COMPLIANCE && (
          <CompliancePanel compliance={data?.compliance} />
        )}
        {activeTab === TABS.DEPENDENCIES && (
          <DependencyView dependencies={data?.dependencies} />
        )}
        {activeTab === TABS.REPORT && (
          <StatusReport
            report={data?.statusReport}
            confidence={data?.envelope?.confidence}
          />
        )}
      </div>
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
