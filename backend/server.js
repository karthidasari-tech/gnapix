const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database (in-memory)
let reminders = [];
let reminderLogs = [];
let userProfiles = {};

// ============ HELPER FUNCTIONS ============

// Calculate compliance score
const calculateComplianceScore = (userId, days = 7) => {
  const userLogs = reminderLogs.filter(log => {
    const reminder = reminders.find(r => r.id === log.reminderId);
    return reminder?.userId === userId;
  });

  const now = new Date();
  const pastDays = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const recentLogs = userLogs.filter(log => new Date(log.completedAt) > pastDays);
  
  if (recentLogs.length === 0) return 0;
  
  const verifiedCount = recentLogs.filter(log => log.gestureVerified).length;
  return Math.round((verifiedCount / recentLogs.length) * 100);
};

// Get user's reminder streak
const getStreak = (userId) => {
  const userLogs = reminderLogs
    .filter(log => {
      const reminder = reminders.find(r => r.id === log.reminderId);
      return reminder?.userId === userId;
    })
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  if (userLogs.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < userLogs.length - 1; i++) {
    const currentDate = new Date(userLogs[i].completedAt);
    const nextDate = new Date(userLogs[i + 1].completedAt);
    
    currentDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const diffTime = currentDate - nextDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// Smart scheduling - suggest best reminder time
const suggestBestTime = (userId) => {
  const userLogs = reminderLogs.filter(log => {
    const reminder = reminders.find(r => r.id === log.reminderId);
    return reminder?.userId === userId;
  });

  if (userLogs.length < 3) return null;

  const times = userLogs.map(log => {
    const date = new Date(log.completedAt);
    return date.getHours() * 60 + date.getMinutes();
  });

  const avgTime = Math.round(times.reduce((a, b) => a + b) / times.length);
  const hours = Math.floor(avgTime / 60).toString().padStart(2, '0');
  const minutes = (avgTime % 60).toString().padStart(2, '0');

  return `${hours}:${minutes}`;
};

// ============ API ENDPOINTS ============

// Get user profile with smart data
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  
  const profile = userProfiles[userId] || {
    userId,
    totalReminders: 0,
    completedToday: 0,
    streak: 0,
    weeklyScore: 0,
    suggestedTime: null
  };

  profile.totalReminders = reminders.filter(r => r.userId === userId).length;
  profile.streak = getStreak(userId);
  profile.weeklyScore = calculateComplianceScore(userId, 7);
  profile.suggestedTime = suggestBestTime(userId);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  profile.completedToday = reminderLogs.filter(log => {
    const logDate = new Date(log.completedAt);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  }).length;

  userProfiles[userId] = profile;
  res.json(profile);
});

// GET all reminders for a user
app.get('/api/reminders/:userId', (req, res) => {
  const userReminders = reminders.filter(r => r.userId === req.params.userId);
  res.json(userReminders);
});

// CREATE new reminder with smart scheduling
app.post('/api/reminders', (req, res) => {
  const { userId, medication, time, dosage, notes } = req.body;
  
  const reminder = {
    id: uuidv4(),
    userId,
    medication,
    time,
    dosage,
    notes,
    createdAt: new Date(),
    isActive: true,
    missedCount: 0
  };
  
  reminders.push(reminder);
  res.json({ success: true, reminder });
});

// UPDATE reminder (mark as completed with gesture verification)
app.put('/api/reminders/:id/complete', (req, res) => {
  const { gestureVerified } = req.body;
  
  const reminder = reminders.find(r => r.id === req.params.id);
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  const log = {
    id: uuidv4(),
    reminderId: reminder.id,
    completedAt: new Date(),
    gestureVerified: gestureVerified,
    medication: reminder.medication,
    confidence: gestureVerified ? 0.85 : 0
  };

  reminderLogs.push(log);
  reminder.missedCount = 0;

  res.json({ 
    success: true, 
    message: 'Reminder completed',
    log 
  });
});

// GET smart dashboard data
app.get('/api/dashboard/:userId', (req, res) => {
  const { userId } = req.params;
  
  const userReminders = reminders.filter(r => r.userId === userId);
  const weeklyScore = calculateComplianceScore(userId, 7);
  const monthlyScore = calculateComplianceScore(userId, 30);
  const streak = getStreak(userId);
  const suggestedTime = suggestBestTime(userId);

  res.json({
    totalReminders: userReminders.length,
    activeReminders: userReminders.filter(r => r.isActive).length,
    weeklyScore,
    monthlyScore,
    streak,
    suggestedTime,
    reminders: userReminders
  });
});

// GET completion history with analytics
app.get('/api/history/:userId', (req, res) => {
  const userHistory = reminderLogs.filter(log => {
    const reminder = reminders.find(r => r.id === log.reminderId);
    return reminder?.userId === req.params.userId;
  });

  res.json(userHistory);
});

// GET adaptive notification level
app.get('/api/notification-level/:reminderId', (req, res) => {
  const reminder = reminders.find(r => r.id === req.params.reminderId);
  
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  const missedCount = reminder.missedCount || 0;
  let notificationLevel = 0;

  if (missedCount >= 3) notificationLevel = 2;
  else if (missedCount >= 1) notificationLevel = 1;

  res.json({ notificationLevel, missedCount });
});

// Mark reminder as skipped
app.put('/api/reminders/:id/skip', (req, res) => {
  const reminder = reminders.find(r => r.id === req.params.id);
  
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  reminder.missedCount = (reminder.missedCount || 0) + 1;

  res.json({ 
    success: true, 
    message: 'Reminder skipped',
    missedCount: reminder.missedCount
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Gnapix Server running on http://localhost:${PORT}`);
});