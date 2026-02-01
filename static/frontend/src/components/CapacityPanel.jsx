import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';

function CapacityPanel({ config, onSave }) {
  const [capacityType, setCapacityType] = useState('team'); // 'team' or 'individual'
  const [period, setPeriod] = useState('week');
  const [teamHours, setTeamHours] = useState(160); // Total team hours
  const [teamMembers, setTeamMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    if (config) {
      setCapacityType(config.capacityType || 'team');
      setPeriod(config.capacityPeriod || 'week');
      setTeamHours(config.teamHours || 160);
      setTeamMembers(config.teamMembers || []);
    }
  }, [config]);

  // Fetch all users on mount
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const result = await invoke('getUsers', { query: '' });
        if (result.success) {
          setAllUsers(result.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchAllUsers();
  }, []);

  // Filter users based on search and existing team members
  useEffect(() => {
    const existingNames = teamMembers.map(m => m.name.toLowerCase());
    let filtered = allUsers.filter(
      u => !existingNames.includes(u.displayName.toLowerCase())
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [allUsers, teamMembers, searchQuery]);

  const handleToggleUser = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.accountId === user.accountId);
      if (isSelected) {
        return prev.filter(u => u.accountId !== user.accountId);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddSelected = () => {
    const newMembers = selectedUsers.map(user => ({
      name: user.displayName,
      accountId: user.accountId,
      hoursPerPeriod: 40,
      startDate: null,
      endDate: null
    }));

    setTeamMembers([...teamMembers, ...newMembers]);
    setSelectedUsers([]);
    setShowDropdown(false);
    setSearchQuery('');
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

  const handleCapacityTypeChange = (type) => {
    setCapacityType(type);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...config,
        capacityMode: 'manual',
        capacityType: capacityType,
        capacityPeriod: period,
        teamHours: teamHours,
        teamMembers: capacityType === 'individual' ? teamMembers : []
      };
      await onSave(newConfig);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save capacity:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalCapacity = capacityType === 'team'
    ? teamHours
    : teamMembers.reduce((sum, m) => sum + (m.hoursPerPeriod || 0), 0);
  const periodLabel = period === 'week' ? 'week' : 'month';

  return (
    <div className="capacity-panel">
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
        Team Capacity
      </h3>

      {/* Capacity Type Toggle */}
      <div className="capacity-type-toggle">
        <label style={{ fontWeight: 500, marginRight: '12px' }}>Capacity Type:</label>
        <button
          className={`period-button ${capacityType === 'team' ? 'active' : ''}`}
          onClick={() => handleCapacityTypeChange('team')}
        >
          Team Total
        </button>
        <button
          className={`period-button ${capacityType === 'individual' ? 'active' : ''}`}
          onClick={() => handleCapacityTypeChange('individual')}
        >
          Per User
        </button>
      </div>

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

      {/* Team Total Capacity */}
      {capacityType === 'team' && (
        <div className="capacity-team-section">
          <label className="capacity-team-label">
            Total Team Hours per {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}:
          </label>
          <div className="capacity-team-input-row">
            <input
              type="number"
              min="0"
              max="10000"
              step="1"
              value={teamHours}
              onChange={(e) => { setTeamHours(parseFloat(e.target.value) || 0); setSaved(false); }}
              className="capacity-team-input"
            />
            <span className="capacity-team-unit">hours</span>
          </div>
          <p className="capacity-team-hint">
            Enter the total available hours for your entire team per {periodLabel}.
          </p>
        </div>
      )}

      {/* Individual Capacity */}
      {capacityType === 'individual' && (
        <div className="capacity-members-section">
          <div className="capacity-members-header">
            <span>Team Member</span>
            <span>Hours/{periodLabel}</span>
            <span></span>
          </div>

          {teamMembers.length === 0 ? (
            <div className="capacity-empty">
              No team members configured. Select users below.
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

          {/* Add Members - User Multi-Select */}
          <div className="capacity-add-member" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={loadingUsers ? "Loading users..." : "Click to select users..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="new-member-input"
              autoComplete="off"
              readOnly={loadingUsers}
            />

            {selectedUsers.length > 0 && (
              <button
                className="add-selected-button"
                onClick={handleAddSelected}
              >
                Add {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
              </button>
            )}

            {/* User Dropdown with Checkboxes */}
            {showDropdown && !loadingUsers && (
              <div className="user-dropdown">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some(u => u.accountId === user.accountId);
                    return (
                      <label
                        key={user.accountId}
                        className={`user-dropdown-item ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUser(user)}
                          className="user-checkbox"
                        />
                        {user.avatarUrl && (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="user-avatar"
                          />
                        )}
                        <span>{user.displayName}</span>
                      </label>
                    );
                  })
                ) : (
                  <div className="user-dropdown-empty">
                    {searchQuery ? 'No matching users' : 'All users already added'}
                  </div>
                )}

                {filteredUsers.length > 0 && (
                  <div className="user-dropdown-footer">
                    <button
                      className="close-dropdown-button"
                      onClick={() => setShowDropdown(false)}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
            <strong>Team Total:</strong> Enter a single number for the whole team's capacity.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Per User:</strong> Set individual hours for each team member.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Weekly:</strong> Hours are spread across 5 business days per week.
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>Monthly:</strong> Hours are spread across ~22 business days per month.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CapacityPanel;
