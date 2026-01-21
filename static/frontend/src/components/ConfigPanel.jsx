import React, { useState, useEffect } from 'react';

function ConfigPanel({ config, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    demandJql: 'project = DEV and Summary !~ Capacity',
    capacityJql: 'project = DEV and Summary ~ Capacity'
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        demandJql: config.demandJql || formData.demandJql,
        capacityJql: config.capacityJql || formData.capacityJql
      });
    }
  }, [config]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-panel">
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Settings
      </h3>

      <div className="config-field">
        <label htmlFor="demandJql">Demand JQL Query</label>
        <textarea
          id="demandJql"
          value={formData.demandJql}
          onChange={(e) => handleChange('demandJql', e.target.value)}
          placeholder="e.g., project = DEV and Summary !~ Capacity"
        />
        <p className="help-text">
          JQL query to fetch demand issues (work that needs to be done).
          Issues should have Due Date, Start Date, and Remaining Estimate fields populated.
        </p>
      </div>

      <div className="config-field">
        <label htmlFor="capacityJql">Capacity JQL Query</label>
        <textarea
          id="capacityJql"
          value={formData.capacityJql}
          onChange={(e) => handleChange('capacityJql', e.target.value)}
          placeholder="e.g., project = DEV and Summary ~ Capacity"
        />
        <p className="help-text">
          JQL query to fetch capacity issues. Each issue should have Start Date,
          Due Date, and a custom field indicating hours per day available.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {onCancel && (
          <button
            className="cancel-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
        {saved && (
          <span style={{ color: '#00875A', fontSize: '13px' }}>
            Configuration saved successfully
          </span>
        )}
      </div>

      {/* Help Section */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#F4F5F7',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>How it works</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#5E6C84' }}>
          <li>
            <strong>Demand issues</strong> are work items that need to be completed.
            Their remaining estimates are spread across business days between Start Date and Due Date.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Capacity issues</strong> represent available bandwidth.
            Each issue contributes its hours-per-day value to the capacity for each business day in its date range.
          </li>
          <li style={{ marginTop: '8px' }}>
            The <strong>Feasibility Envelope</strong> compares cumulative demand vs capacity over time
            to identify when demand exceeds available resources.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Compliance checks</strong> detect planning violations like missing dates,
            overdue items, and dependency conflicts.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ConfigPanel;
