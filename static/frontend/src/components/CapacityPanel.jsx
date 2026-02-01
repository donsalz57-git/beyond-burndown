import React, { useState, useEffect } from 'react';

function CapacityPanel({ config, onSave }) {
  const [period, setPeriod] = useState('week');
  const [teamMembers, setTeamMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  useEffect(() => {
    if (config) {
      setPeriod(config.capacityPeriod || 'week');
      setTeamMembers(config.teamMembers || []);
    }
  }, [config]);

  const handleAddMember = () => {
    const name = newMemberName.trim();
    if (!name) return;

    // Check for duplicate
    if (teamMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    setTeamMembers([
      ...teamMembers,
      { name, hoursPerPeriod: 40, startDate: null, endDate: null }
    ]);
    setNewMemberName('');
    setSaved(false);
  };

  const handleRemoveMember = (index) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleUpdateHours = (index, hours) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], hoursPerPeriod: parseFloat(hours) || 0 };
    setTeamMembers(updated);
    setSaved(false);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...config,
        capacityMode: 'manual',
        capacityPeriod: period,
        teamMembers: teamMembers
      };
      await onSave(newConfig);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save capacity:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalCapacity = teamMembers.reduce((sum, m) => sum + (m.hoursPerPeriod || 0), 0);
  const periodLabel = period === 'week' ? 'week' : 'month';

  return (
    <div className="capacity-panel">
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Team Capacity
      </h3>

      {/* Period Toggle */}
      <div className="capacity-period-toggle">
        <label style={{ fontWeight: 500, marginRight: '12px' }}>Time Period:</label>
        <button
          className={`period-button ${period === 'week' ? 'active' : ''}`}
          onClick={() => handlePeriodChange('week')}
        >
          Weekly
        </button>
        <button
          className={`period-button ${period === 'month' ? 'active' : ''}`}
          onClick={() => handlePeriodChange('month')}
        >
          Monthly
        </button>
      </div>

      {/* Team Members List */}
      <div className="capacity-members-section">
        <div className="capacity-members-header">
          <span>Team Member</span>
          <span>Hours/{periodLabel}</span>
          <span></span>
        </div>

        {teamMembers.length === 0 ? (
          <div className="capacity-empty">
            No team members configured. Add team members below.
          </div>
        ) : (
          <div className="capacity-members-list">
            {teamMembers.map((member, index) => (
              <div key={index} className="capacity-member-row">
                <span className="member-name">{member.name}</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={member.hoursPerPeriod}
                  onChange={(e) => handleUpdateHours(index, e.target.value)}
                  className="hours-input"
                />
                <button
                  className="remove-member-button"
                  onClick={() => handleRemoveMember(index)}
                  title="Remove team member"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Member */}
        <div className="capacity-add-member">
          <input
            type="text"
            placeholder="Enter name"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
            className="new-member-input"
          />
          <button
            className="add-member-button"
            onClick={handleAddMember}
            disabled={!newMemberName.trim()}
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Total Summary */}
      <div className="capacity-total">
        <strong>Total Team Capacity:</strong>{' '}
        <span className="total-value">{totalCapacity} hrs/{periodLabel}</span>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Capacity'}
        </button>
        {saved && (
          <span style={{ color: '#00875A', fontSize: '13px' }}>
            Capacity saved successfully
          </span>
        )}
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#F4F5F7',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>How capacity works</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#5E6C84' }}>
          <li>
            Enter each team member's available hours per {periodLabel}.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Weekly:</strong> Hours are spread across 5 business days per week.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Monthly:</strong> Hours are spread across ~22 business days per month.
          </li>
          <li style={{ marginTop: '8px' }}>
            The feasibility analysis compares total capacity against demand to forecast delivery.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CapacityPanel;
