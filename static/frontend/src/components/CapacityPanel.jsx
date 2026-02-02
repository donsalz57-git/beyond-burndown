import React, { useState, useEffect } from 'react';
import { invoke } from '@forge/bridge';

function CapacityPanel({ config, onSave }) {
  const [capacityType, setCapacityType] = useState('team'); // 'team' or 'individual'
  const [capacityMode, setCapacityMode] = useState('fixed'); // 'fixed' or 'variable'
  const [period, setPeriod] = useState('week');
  const [teamHours, setTeamHours] = useState(160);
  const [teamMembers, setTeamMembers] = useState([]);
  const [capacitySchedule, setCapacitySchedule] = useState([]); // For variable capacity
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
      setCapacityMode(config.variableCapacity ? 'variable' : 'fixed');
      setPeriod(config.capacityPeriod || 'week');
      setTeamHours(config.teamHours || 160);
      setTeamMembers(config.teamMembers || []);
      setCapacitySchedule(config.capacitySchedule || []);
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
    const removedMember = teamMembers[index];
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
    // Also remove from schedule
    setCapacitySchedule(prev => prev.map(entry => {
      const newMembers = { ...entry.memberHours };
      delete newMembers[removedMember.name];
      return { ...entry, memberHours: newMembers };
    }));
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

  const handleCapacityModeChange = (mode) => {
    setCapacityMode(mode);
    if (mode === 'variable' && capacitySchedule.length === 0) {
      // Initialize with a few periods
      const today = new Date();
      const entries = [];
      for (let i = 0; i < 4; i++) {
        const startDate = new Date(today);
        if (period === 'week') {
          startDate.setDate(today.getDate() + (i * 7));
        } else {
          startDate.setMonth(today.getMonth() + i);
        }
        entries.push({
          id: `period-${i}`,
          startDate: startDate.toISOString().split('T')[0],
          teamHours: teamHours,
          memberHours: teamMembers.reduce((acc, m) => {
            acc[m.name] = m.hoursPerPeriod;
            return acc;
          }, {})
        });
      }
      setCapacitySchedule(entries);
    }
    setSaved(false);
  };

  const handleAddPeriod = () => {
    const lastEntry = capacitySchedule[capacitySchedule.length - 1];
    const lastDate = lastEntry ? new Date(lastEntry.startDate) : new Date();
    const newDate = new Date(lastDate);
    if (period === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }

    setCapacitySchedule([...capacitySchedule, {
      id: `period-${Date.now()}`,
      startDate: newDate.toISOString().split('T')[0],
      teamHours: teamHours,
      memberHours: teamMembers.reduce((acc, m) => {
        acc[m.name] = m.hoursPerPeriod;
        return acc;
      }, {})
    }]);
    setSaved(false);
  };

  const handleRemovePeriod = (index) => {
    setCapacitySchedule(capacitySchedule.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleUpdateScheduleTeamHours = (index, hours) => {
    const updated = [...capacitySchedule];
    updated[index] = { ...updated[index], teamHours: parseFloat(hours) || 0 };
    setCapacitySchedule(updated);
    setSaved(false);
  };

  const handleUpdateScheduleMemberHours = (index, memberName, hours) => {
    const updated = [...capacitySchedule];
    updated[index] = {
      ...updated[index],
      memberHours: {
        ...updated[index].memberHours,
        [memberName]: parseFloat(hours) || 0
      }
    };
    setCapacitySchedule(updated);
    setSaved(false);
  };

  const handleUpdateScheduleDate = (index, date) => {
    const updated = [...capacitySchedule];
    updated[index] = { ...updated[index], startDate: date };
    setCapacitySchedule(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        ...config,
        capacityMode: 'manual',
        capacityType: capacityType,
        variableCapacity: capacityMode === 'variable',
        capacityPeriod: period,
        teamHours: teamHours,
        teamMembers: capacityType === 'individual' ? teamMembers : [],
        capacitySchedule: capacityMode === 'variable' ? capacitySchedule : []
      };
      await onSave(newConfig);
      setSaved(true);
    } catch (error) {
      console.error('Failed to save capacity:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        <label>Capacity Type:</label>
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
        <label>Time Period:</label>
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

      {/* Fixed vs Variable Toggle */}
      <div className="capacity-mode-toggle">
        <label>Schedule:</label>
        <button
          className={`period-button ${capacityMode === 'fixed' ? 'active' : ''}`}
          onClick={() => handleCapacityModeChange('fixed')}
        >
          Fixed
        </button>
        <button
          className={`period-button ${capacityMode === 'variable' ? 'active' : ''}`}
          onClick={() => handleCapacityModeChange('variable')}
        >
          Variable
        </button>
      </div>

      {/* FIXED MODE */}
      {capacityMode === 'fixed' && (
        <>
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
                              <img src={user.avatarUrl} alt="" className="user-avatar" />
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
                        <button className="close-dropdown-button" onClick={() => setShowDropdown(false)}>
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* VARIABLE MODE - Schedule Table */}
      {capacityMode === 'variable' && (
        <div className="capacity-schedule-section">
          <div className="capacity-schedule-table-wrapper">
            <table className="capacity-schedule-table">
              <thead>
                <tr>
                  <th>{period === 'week' ? 'Week Starting' : 'Month'}</th>
                  {capacityType === 'team' ? (
                    <th>Team Hours</th>
                  ) : (
                    teamMembers.map((m, i) => (
                      <th key={i}>{m.name}</th>
                    ))
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {capacitySchedule.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        type="date"
                        value={entry.startDate}
                        onChange={(e) => handleUpdateScheduleDate(index, e.target.value)}
                        className="schedule-date-input"
                      />
                    </td>
                    {capacityType === 'team' ? (
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={entry.teamHours}
                          onChange={(e) => handleUpdateScheduleTeamHours(index, e.target.value)}
                          className="schedule-hours-input"
                        />
                      </td>
                    ) : (
                      teamMembers.map((m, mIndex) => (
                        <td key={mIndex}>
                          <input
                            type="number"
                            min="0"
                            value={entry.memberHours?.[m.name] || 0}
                            onChange={(e) => handleUpdateScheduleMemberHours(index, m.name, e.target.value)}
                            className="schedule-hours-input"
                          />
                        </td>
                      ))
                    )}
                    <td>
                      <button
                        className="remove-period-button"
                        onClick={() => handleRemovePeriod(index)}
                        title="Remove period"
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="add-period-button" onClick={handleAddPeriod}>
            + Add {period === 'week' ? 'Week' : 'Month'}
          </button>

          {capacityType === 'individual' && teamMembers.length === 0 && (
            <div className="capacity-empty" style={{ marginTop: '16px' }}>
              Add team members first to set variable capacity.
              <div className="capacity-add-member" style={{ position: 'relative', marginTop: '12px' }}>
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
                  <button className="add-selected-button" onClick={handleAddSelected}>
                    Add {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
                  </button>
                )}

                {showDropdown && !loadingUsers && (
                  <div className="user-dropdown">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u.accountId === user.accountId);
                        return (
                          <label key={user.accountId} className={`user-dropdown-item ${isSelected ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUser(user)}
                              className="user-checkbox"
                            />
                            {user.avatarUrl && <img src={user.avatarUrl} alt="" className="user-avatar" />}
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
                        <button className="close-dropdown-button" onClick={() => setShowDropdown(false)}>Done</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Summary */}
      {capacityMode === 'fixed' && (
        <div className="capacity-total">
          <strong>Total Team Capacity:</strong>{' '}
          <span className="total-value">{totalCapacity} hrs/{periodLabel}</span>
        </div>
      )}

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
          <li><strong>Fixed:</strong> Same capacity every {periodLabel}.</li>
          <li style={{ marginTop: '8px' }}><strong>Variable:</strong> Different capacity for each {periodLabel} (vacations, ramp-up, etc.).</li>
          <li style={{ marginTop: '8px' }}><strong>Team Total:</strong> Single number for the whole team.</li>
          <li style={{ marginTop: '8px' }}><strong>Per User:</strong> Individual hours for each team member.</li>
        </ul>
      </div>
    </div>
  );
}

export default CapacityPanel;
