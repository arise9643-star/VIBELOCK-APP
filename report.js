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

// Fetch and display all report data
async function loadReports() {
    try {
        // Fetch pre-calculated stats from stats endpoint
        const statsResponse = await fetch(`${API_URL}/stats/user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const statsData = await statsResponse.json();
        
        if (statsResponse.ok && statsData.stats) {
            // Use stats directly from backend
            const stats = statsData.stats;
            
            // Update all UI with stats data
            updateOverviewCards(stats);
        } else {
            console.error('No stats found or response error:', statsData);
        }
        
        // Also fetch sessions for charts
        const historyResponse = await fetch(`${API_URL}/sessions/history?limit=500`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const historyData = await historyResponse.json();
        
        if (historyResponse.ok && historyData.sessions) {
            updateWeeklyChart(historyData.sessions);
            updateFocusDistribution(historyData.sessions);
            updateAchievements(statsData.stats);
        }
        
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Update overview stat cards
function updateOverviewCards(stats) {
    // Total Sessions
    const sessionValue = document.querySelector('.overview-card:nth-child(1) .card-value');
    if (sessionValue) {
        sessionValue.textContent = stats.totalSessions || 0;
    }
    
    // Total Focus Time
    const focusTimeValue = document.querySelector('.overview-card:nth-child(2) .card-value');
    if (focusTimeValue) {
        focusTimeValue.textContent = stats.totalFocusTime || '0:00:00';
    }
    
    // Average Session
    const avgValue = document.querySelector('.overview-card:nth-child(3) .card-value');
    if (avgValue) {
        avgValue.textContent = stats.averageSession || '0:00:00';
    }
    
    // Total Pomodoros
    const pomodorosValue = document.querySelector('.overview-card:nth-child(4) .card-value');
    if (pomodorosValue) {
        pomodorosValue.textContent = stats.totalPomodoros || 0;
    }
}

// Update weekly activity bar chart
function updateWeeklyChart(sessions) {
    // Group sessions by day of week
    const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const weekData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    
    // Get sessions from last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    sessions.forEach(session => {
        const sessionDate = new Date(session.started_at);
        if (sessionDate >= sevenDaysAgo) {
            const dayName = dayMap[sessionDate.getDay()];
            weekData[dayName] += session.duration_seconds || 0;
        }
    });
    
    // Find max value for scaling
    const maxSeconds = Math.max(...Object.values(weekData));
    
    // Update bars
    const barGroups = document.querySelectorAll('.bar-group');
    barGroups.forEach((group, index) => {
        const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index];
        const seconds = weekData[dayName];
        const heightPercent = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;
        
        const bar = group.querySelector('.bar');
        if (bar) {
            bar.style.height = `${heightPercent}%`;
        }
    });
}

// Update focus distribution
function updateFocusDistribution(sessions) {
    if (sessions.length === 0) {
        return;
    }
    
    let totalFocused = 0;
    let totalNeutral = 0;
    let totalDistracted = 0;
    
    sessions.forEach(session => {
        totalFocused += session.time_focused_seconds || 0;
        totalNeutral += session.time_neutral_seconds || 0;
        totalDistracted += session.time_distracted_seconds || 0;
    });
    
    const total = totalFocused + totalNeutral + totalDistracted;
    
    if (total === 0) {
        // Keep at 0% if no data
        totalFocused = 0;
        totalNeutral = 0;
        totalDistracted = 0;
    } else {
        totalFocused = Math.round((totalFocused / total) * 100);
        totalNeutral = Math.round((totalNeutral / total) * 100);
        totalDistracted = Math.round((totalDistracted / total) * 100);
    }
    
    // Get all distribution items
    const items = document.querySelectorAll('.distribution-item');
    
    if (items.length >= 3) {
        // Update focused
        const focusedFill = items[0].querySelector('.distribution-fill.focused');
        const focusedValue = items[0].querySelector('.label-value');
        if (focusedFill) focusedFill.style.width = `${totalFocused}%`;
        if (focusedValue) focusedValue.textContent = `${totalFocused}%`;
        
        // Update neutral
        const neutralFill = items[1].querySelector('.distribution-fill.neutral');
        const neutralValue = items[1].querySelector('.label-value');
        if (neutralFill) neutralFill.style.width = `${totalNeutral}%`;
        if (neutralValue) neutralValue.textContent = `${totalNeutral}%`;
        
        // Update distracted
        const distractedFill = items[2].querySelector('.distribution-fill.distracted');
        const distractedValue = items[2].querySelector('.label-value');
        if (distractedFill) distractedFill.style.width = `${totalDistracted}%`;
        if (distractedValue) distractedValue.textContent = `${totalDistracted}%`;
    }
}

// Update achievements based on stats
function updateAchievements(stats) {
    // This is placeholder logic - you can customize based on your achievement system
    const achievements = [];
    
    if (stats.totalSessions >= 100) {
        achievements.push({
            icon: '🏆',
            title: 'Century Club',
            desc: 'Completed 100+ sessions'
        });
    }
    
    if (stats.totalPomodoros >= 50) {
        achievements.push({
            icon: '🍅',
            title: 'Pomodoro Master',
            desc: `${stats.totalPomodoros} pomodoros completed`
        });
    }
    
    if (stats.totalSessions >= 7) {
        achievements.push({
            icon: '🔥',
            title: '7 Day Streak',
            desc: 'Active for 7 consecutive days'
        });
    }
    
    // Always show focus master
    achievements.push({
        icon: '🎯',
        title: 'Focus Master',
        desc: 'Maintaining great focus'
    });
    
    // Update achievements grid
    const achievementsGrid = document.querySelector('.achievements-grid');
    if (achievementsGrid && achievements.length > 0) {
        achievementsGrid.innerHTML = achievements.map(ach => `
            <div class="achievement-card">
                <div class="achievement-icon">${ach.icon}</div>
                <h4 class="achievement-title">${ach.title}</h4>
                <p class="achievement-desc">${ach.desc}</p>
            </div>
        `).join('');
    }
}

// Load all report data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadReports();
    
    // Set up polling to refresh stats every 30 seconds
    setInterval(loadReports, 30000);
});
