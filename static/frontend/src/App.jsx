import React, { useState, useEffect, Component } from 'react';
import { view } from '@forge/bridge';
import { useGadgetData } from './hooks/useGadgetData';
import FeasibilityChart from './components/FeasibilityChart';
import CompliancePanel from './components/CompliancePanel';
import DependencyView from './components/DependencyView';
import ConfigPanel from './components/ConfigPanel';
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
  COMPLIANCE: 'compliance',
  DEPENDENCIES: 'dependencies'
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.FEASIBILITY);
  const [isEditMode, setIsEditMode] = useState(false);
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
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === TABS.FEASIBILITY && (
          <FeasibilityChart envelope={data?.envelope} />
        )}
        {activeTab === TABS.COMPLIANCE && (
          <CompliancePanel compliance={data?.compliance} />
        )}
        {activeTab === TABS.DEPENDENCIES && (
          <DependencyView dependencies={data?.dependencies} />
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
