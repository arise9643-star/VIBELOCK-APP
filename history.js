const API_URL = 'https://vibelock-app.onrender.com/api';

// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
    window.location.href = 'login.html';
}

// Fetch session history
async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/sessions/history?limit=20`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateHistoryUI(applyFilter(data.sessions));
        } else {
            console.error('Failed to load history:', data.error);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function applyFilter(sessions) {
    const activeBtn = document.querySelector('.tab-btn.active');
    const filter = activeBtn ? activeBtn.dataset.filter : 'all';
    const now = new Date();
    if (filter === 'today') {
        return sessions.filter(s => {
            const d = new Date(s.started_at);
            return d.toDateString() === now.toDateString();
        });
    }
    if (filter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0,0,0,0);
        return sessions.filter(s => {
            const d = new Date(s.started_at);
            return d >= startOfWeek;
        });
    }
    if (filter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return sessions.filter(s => {
            const d = new Date(s.started_at);
            return d >= startOfMonth;
        });
    }
    return sessions;
}

// Update history UI
function updateHistoryUI(sessions) {
    const container = document.querySelector('.history-timeline');
    
    if (!container) return;
    
    if (sessions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 48px;">No sessions yet. Start your first focus session!</p>';
        return;
    }
    
    container.innerHTML = sessions.map(session => {
        const date = new Date(session.started_at);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        
        const duration = formatDuration(session.duration_seconds || 0);
        const pomodoros = session.pomodoros_completed || 0;
        const role = session.role || 'Neutral';
        
        return `
            <div class="session-item">
                <div class="session-date">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="session-content">
                    <div class="session-header">
                        <h3 class="session-title">${session.room_name || 'Focus Session'}</h3>
                        <span class="session-duration">${duration}</span>
                    </div>
                    <div class="session-stats">
                        <div class="stat-pill">
                            <span class="stat-icon">🍅</span>
                            <span>${pomodoros} Pomodoros</span>
                        </div>
                        <div class="stat-pill">
                            <span class="stat-icon">⭐</span>
                            <span>${role}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Filter functionality
const filterBtns = document.querySelectorAll('.tab-btn');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        loadHistory();
    });
});

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    
    // Set up polling to refresh history every 30 seconds
    setInterval(loadHistory, 30000);
});
