import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GestureDetector from './GestureDetector';

const API_BASE ='https://gnapix.onrender.com/api';
const USER_ID = 'user_' + Math.random().toString(36).substr(2, 9);

const SmartDashboard = () => {
  const [profile, setProfile] = useState({
    streak: 0,
    weeklyScore: 0,
    completedToday: 0,
    suggestedTime: null,
    totalReminders: 0
  });

  const [reminders, setReminders] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [formData, setFormData] = useState({
    medication: '',
    time: '',
    dosage: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await axios.get(`${API_BASE}/profile/${USER_ID}`);
      setProfile(profileRes.data);

      const remindersRes = await axios.get(`${API_BASE}/reminders/${USER_ID}`);
      setReminders(remindersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/reminders`, {
        userId: USER_ID,
        ...formData
      });
      setFormData({ medication: '', time: '', dosage: '', notes: '' });
      fetchData();
      alert('✅ Reminder added!');
    } catch (error) {
      console.error('Failed to create reminder:', error);
      alert('❌ Error adding reminder');
    }
  };

  const handleVerification = async (verification) => {
    if (!selectedReminder) return;

    try {
      await axios.put(
        `${API_BASE}/reminders/${selectedReminder.id}/complete`,
        { gestureVerified: verification.verified }
      );

      alert(`✅ Reminder completed!\n📊 Confidence: ${(verification.confidence * 100).toFixed(0)}%`);
      setShowCamera(false);
      setSelectedReminder(null);
      fetchData();
    } catch (error) {
      console.error('Failed to complete reminder:', error);
    }
  };

  const handleSkipReminder = async (reminderId) => {
    try {
      await axios.put(`${API_BASE}/reminders/${reminderId}/skip`);
      alert('⏭️ Reminder skipped');
      fetchData();
    } catch (error) {
      console.error('Failed to skip reminder:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🩺 Gnapix</h1>
        <p className="tagline">Your Smart Medication Friend</p>
      </header>

      {/* Smart Stats Section */}
      <section className="smart-stats">
        <div className="stat-card stat-streak">
          <div className="stat-number">{profile.streak}</div>
          <div className="stat-label">🔥 Day Streak</div>
          <div className="stat-subtitle">Keep it up!</div>
        </div>

        <div className="stat-card stat-score">
          <div className="stat-number">{profile.weeklyScore}%</div>
          <div className="stat-label">📈 Weekly Score</div>
          <div className="stat-subtitle">Compliance rate</div>
        </div>

        <div className="stat-card stat-today">
          <div className="stat-number">{profile.completedToday}</div>
          <div className="stat-label">✅ Completed Today</div>
          <div className="stat-subtitle">Out of {profile.totalReminders}</div>
        </div>

        {profile.suggestedTime && (
          <div className="stat-card stat-smart">
            <div className="stat-time">{profile.suggestedTime}</div>
            <div className="stat-label">⏰ Best Time</div>
            <div className="stat-subtitle">Based on your routine</div>
          </div>
        )}
      </section>

      {/* Add Reminder Form */}
      <section className="add-reminder">
        <h2>➕ Add New Reminder</h2>
        <form onSubmit={handleAddReminder}>
          <div className="form-group">
            <label>Medication Name</label>
            <input
              type="text"
              placeholder="e.g., Aspirin, Vitamin D"
              value={formData.medication}
              onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Dosage</label>
              <input
                type="text"
                placeholder="e.g., 500mg"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              placeholder="Take with water, with food, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary">Add Reminder</button>
        </form>
      </section>

      {/* Reminders List */}
      <section className="reminders-list">
        <h2>📋 Your Reminders</h2>
        {reminders.length === 0 ? (
          <div className="empty-state">
            <p>📭 No reminders yet. Add one above!</p>
          </div>
        ) : (
          <div className="reminders-grid">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="reminder-card">
                <div className="reminder-header">
                  <h3>💊 {reminder.medication}</h3>
                  <span className={`status ${reminder.isActive ? 'active' : 'inactive'}`}>
                    {reminder.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="reminder-details">
                  <p><strong>⏰ Time:</strong> {reminder.time}</p>
                  <p><strong>📊 Dosage:</strong> {reminder.dosage}</p>
                  {reminder.notes && <p><strong>📝 Notes:</strong> {reminder.notes}</p>}
                </div>

                <div className="reminder-actions">
                  <button
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setShowCamera(true);
                    }}
                    className="btn-verify"
                  >
                    ✓ Mark Complete
                  </button>

                  <button
                    onClick={() => handleSkipReminder(reminder.id)}
                    className="btn-skip"
                  >
                    ⏭️ Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal">
          <div className="modal-content">
            <button
              onClick={() => setShowCamera(false)}
              className="close-btn"
            >
              ✕
            </button>
            <GestureDetector onVerification={handleVerification} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartDashboard;