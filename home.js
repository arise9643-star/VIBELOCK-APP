const API_URL = 'https://vibelock-app.onrender.com/api';

// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
    window.location.href = 'login.html';
}

// Helper function to format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Calculate streak (consecutive days with sessions)
function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    
    const sessionDates = sessions
        .map(s => new Date(s.started_at).toDateString())
        .filter((date, index, self) => self.indexOf(date) === index)
        .map(d => new Date(d))
        .sort((a, b) => b - a);
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sessionDates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        sessionDates[i].setHours(0, 0, 0, 0);
        if (sessionDates[i].getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// Calculate today's stats
function calculateTodayStats(sessions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(s => {
        const sessionDate = new Date(s.started_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
    });
    
    let totalSeconds = 0;
    let totalPomodoros = 0;
    
    todaySessions.forEach(session => {
        totalSeconds += session.duration_seconds || 0;
        totalPomodoros += session.pomodoros_completed || 0;
    });
    
    return {
        focusTime: formatDuration(totalSeconds),
        pomodoros: totalPomodoros
    };
}

// Calculate weekly goal progress
function calculateWeeklyGoal(sessions) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekSessions = sessions.filter(s => {
        const sessionDate = new Date(s.started_at);
        return sessionDate >= startOfWeek;
    });
    
    const weekGoalMinutes = 300; // 5 hours = 300 minutes
    let totalSeconds = 0;
    
    weekSessions.forEach(session => {
        totalSeconds += session.duration_seconds || 0;
    });
    
    const totalMinutes = Math.floor(totalSeconds / 60);
    const progress = Math.min(100, Math.round((totalMinutes / weekGoalMinutes) * 100));
    
    return progress;
}

// Load and display stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/sessions/history?limit=500`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.sessions) {
            const sessions = data.sessions;
            
            // Calculate all stats
            const streak = calculateStreak(sessions);
            const todayStats = calculateTodayStats(sessions);
            const weeklyGoal = calculateWeeklyGoal(sessions);
            
            // Update streak
            const streakValue = document.querySelector('.stat-box:nth-child(1) .stat-value');
            if (streakValue) {
                streakValue.textContent = `${streak} Day${streak !== 1 ? 's' : ''}`;
            }
            
            // Update today's focus time
            const focusValue = document.querySelector('.stat-box:nth-child(2) .stat-value');
            if (focusValue) {
                focusValue.textContent = todayStats.focusTime;
            }
            
            // Update pomodoros today
            const pomodoroValue = document.querySelector('.stat-box:nth-child(3) .stat-value');
            if (pomodoroValue) {
                pomodoroValue.textContent = todayStats.pomodoros;
            }
            
            // Update weekly goal
            const goalValue = document.querySelector('.stat-box:nth-child(4) .stat-value');
            if (goalValue) {
                goalValue.textContent = `${weeklyGoal}%`;
            }
            
            // Load recent sessions
            updateRecentSessions(sessions.slice(0, 3));
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update recent sessions
function updateRecentSessions(sessions) {
    const activityGrid = document.querySelector('.activity-grid');
    
    if (!activityGrid) return;
    
    if (sessions.length === 0) {
        activityGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 48px;">No sessions yet. Start your first session!</p>';
        return;
    }
    
    activityGrid.innerHTML = sessions.map(session => {
        const date = new Date(session.started_at);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        let timeStr = '';
        if (diffMins < 1) timeStr = 'Just now';
        else if (diffMins < 60) timeStr = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        else if (diffHours < 24) timeStr = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        else if (diffDays === 1) timeStr = 'Yesterday';
        else timeStr = `${diffDays} days ago`;
        
        const duration = formatDuration(session.duration_seconds || 0);
        const pomodoros = session.pomodoros_completed || 0;
        const role = session.role || 'Neutral';
        
        const roleClass = role === 'Focused' ? 'focused' : (role === 'Distracted' ? 'distracted' : 'neutral');
        
        return `
            <div class="activity-card">
                <div class="activity-header">
                    <h3 class="activity-title">${session.room_name || 'Focus Session'}</h3>
                    <span class="activity-time">${timeStr}</span>
                </div>
                <div class="activity-stats">
                    <span class="activity-badge">${duration}</span>
                    <span class="activity-badge">${pomodoros} 🍅</span>
                    <span class="activity-badge ${roleClass}">${role}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Display user name
document.addEventListener('DOMContentLoaded', () => {
    console.log('Logged in as:', user.name);
    loadStats();
    
    // Set up polling to refresh stats every 30 seconds
    setInterval(loadStats, 30000);
});

// Create Room Handler
const createRoomBtn = document.querySelector('.card-blue .btn-create');
if (createRoomBtn) {
    createRoomBtn.addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.card-blue .meeting-input');
        const roomName = inputs[0].value.trim();
        
        if (!roomName) {
            alert('Please enter a room name');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/rooms/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: roomName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                inputs[2].value = data.room.code;
                
                setTimeout(() => {
                    window.location.href = `call.html?code=${data.room.code}`;
                }, 1000);

            } else {
                alert(data.error || 'Failed to create room');
            }
        } catch (error) {
            console.error('Create room error:', error);
            alert('Network error. Please try again.');
        }
    });
}

// Join Room Handler
const joinRoomBtn = document.querySelector('.card-gray .btn-join');
if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', async () => {
        const codeInput = document.querySelector('.card-gray .meeting-input');
        const code = codeInput.value.trim().toUpperCase();
        
        if (!code) {
            alert('Please enter a room code');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/rooms/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Redirect to call page
                window.location.href = `call.html?code=${code}`;
            } else {
                alert(data.error || 'Failed to join room');
            }
        } catch (error) {
            console.error('Join room error:', error);
            alert('Network error. Please try again.');
        }
    });
}