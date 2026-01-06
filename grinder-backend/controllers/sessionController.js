const { query } = require('../config/database');

const startSession = async (req, res) => {
  try {
    const { roomId, pomodoroMinutes } = req.body;
    const userId = req.userId;
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    const result = await query(
      'INSERT INTO sessions (room_id, user_id, started_at, pomodoro_minutes, status) VALUES ($1, $2, NOW(), $3, $4) RETURNING *',
      [roomId, userId, pomodoroMinutes || 45, 'active']
    );
    
    res.status(201).json({
      message: 'Session started',
      session: result.rows[0]
    });
    
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error starting session' });
  }
};

const endSession = async (req, res) => {
  try {
    const { sessionId, pomodorosCompleted, role, durationSeconds, time_focused_seconds, time_neutral_seconds, time_distracted_seconds, times_left_app, times_talked, times_muted } = req.body;
    const userId = req.userId;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const sessionResult = await query(
      'SELECT started_at FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Use provided duration or calculate from timestamps
    let finalDurationSeconds = durationSeconds;
    if (!finalDurationSeconds) {
      const startTime = new Date(sessionResult.rows[0].started_at);
      const endTime = new Date();
      finalDurationSeconds = Math.floor((endTime - startTime) / 1000);
    }
    
    const result = await query(
      `UPDATE sessions SET 
        ended_at = NOW(), 
        duration_seconds = $1, 
        pomodoros_completed = $2, 
        role = $3, 
        status = $4,
        time_focused_seconds = $5,
        time_neutral_seconds = $6,
        time_distracted_seconds = $7,
        times_left_app = $8,
        times_talked = $9,
        times_muted = $10
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [finalDurationSeconds, pomodorosCompleted || 0, role || 'neutral', 'completed', time_focused_seconds || 0, time_neutral_seconds || 0, time_distracted_seconds || 0, times_left_app || 0, times_talked || 0, times_muted || 0, sessionId, userId]
    );
    
    res.json({
      message: 'Session ended',
      session: result.rows[0]
    });
    
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error ending session' });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 10, offset = 0 } = req.query;
    
    const result = await query(
      `SELECT s.*, r.name as room_name, r.code as room_code 
       FROM sessions s 
       LEFT JOIN rooms r ON s.room_id = r.id 
       WHERE s.user_id = $1 AND s.status = 'completed'
       ORDER BY s.started_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    res.json({
      sessions: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { startSession, endSession, getHistory };