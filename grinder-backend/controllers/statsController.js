const { query } = require('../config/database');

const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;
    
    const totalSessionsResult = await query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    const totalTimeResult = await query(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    const pomodorosResult = await query(
      'SELECT COALESCE(SUM(pomodoros_completed), 0) as total_pomodoros FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    const highestResult = await query(
      'SELECT MAX(duration_seconds) as highest FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    const avgResult = await query(
      'SELECT AVG(duration_seconds) as average FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    const totalSessions = parseInt(totalSessionsResult.rows[0].count);
    const totalSeconds = parseInt(totalTimeResult.rows[0].total_seconds);
    const totalPomodoros = parseInt(pomodorosResult.rows[0].total_pomodoros);
    const highestSeconds = parseInt(highestResult.rows[0].highest || 0);
    const averageSeconds = parseInt(avgResult.rows[0].average || 0);
    
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };
    
    res.json({
      stats: {
        totalSessions,
        totalFocusTime: formatTime(totalSeconds),
        totalFocusTimeSeconds: totalSeconds,
        totalPomodoros,
        highestSession: formatTime(highestSeconds),
        averageSession: formatTime(averageSeconds)
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const result = await query(
      `SELECT 
        u.id, 
        u.name, 
        COALESCE(SUM(s.duration_seconds), 0) as total_seconds,
        COALESCE(SUM(s.pomodoros_completed), 0) as total_pomodoros,
        COUNT(s.id) as total_sessions
       FROM users u
       LEFT JOIN sessions s ON u.id = s.user_id AND s.status = 'completed'
       GROUP BY u.id, u.name
       ORDER BY total_seconds DESC
       LIMIT $1`,
      [limit]
    );
    
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      name: row.name,
      totalSeconds: parseInt(row.total_seconds),
      totalPomodoros: parseInt(row.total_pomodoros),
      totalSessions: parseInt(row.total_sessions)
    }));
    
    res.json({ leaderboard });
    
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
};

module.exports = { getUserStats, getLeaderboard };