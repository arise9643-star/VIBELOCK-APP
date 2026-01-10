const API_URL = 'https://vibelock-app.onrender.com/api';

// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
    window.location.href = 'login.html';
}

// DOM Elements
const leaderboardList = document.getElementById('leaderboardList');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const currentUserCard = document.getElementById('currentUserCard');
const totalPlayersEl = document.getElementById('totalPlayers');
const globalFocusTimeEl = document.getElementById('globalFocusTime');
const avgStreakEl = document.getElementById('avgStreak');

// State
let allLeaderboardData = [];
let currentFilter = 'all-time';
let currentSearchQuery = '';

// Format time helper
const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

// Get initials for avatar
const getInitials = (name) => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

// Fetch leaderboard data
const fetchLeaderboard = async () => {
    try {
        leaderboardList.innerHTML = '<div class="loading">Loading leaderboard...</div>';

        const response = await fetch(`${API_URL}/stats/leaderboard?limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        allLeaderboardData = data.leaderboard || [];

        // Calculate stats summary
        if (allLeaderboardData.length > 0) {
            totalPlayersEl.textContent = allLeaderboardData.length;
            
            const totalGlobalTime = allLeaderboardData.reduce((sum, user) => sum + (user.totalSeconds || 0), 0);
            globalFocusTimeEl.textContent = formatTime(totalGlobalTime);
            
            // Calculate average streak
            const totalStreak = allLeaderboardData.reduce((sum, user) => sum + (user.streak || 0), 0);
            const avgStreakVal = Math.round(totalStreak / allLeaderboardData.length);
            avgStreakEl.textContent = `${avgStreakVal} days`;
        }

        displayLeaderboard();
        displayCurrentUser();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardList.innerHTML = '<div class="empty">Failed to load leaderboard</div>';
    }
};

// Display leaderboard rows
const displayLeaderboard = () => {
    let filtered = allLeaderboardData;

    // Filter by search query
    if (currentSearchQuery) {
        filtered = filtered.filter(user =>
            user.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        leaderboardList.innerHTML = '<div class="empty">No users found</div>';
        return;
    }

    leaderboardList.innerHTML = filtered
        .map((user, index) => {
            const isCurrentUser = user.userId === user.id && user.userId === (user.id || user.userId);
            const totalTime = formatTime(user.totalSeconds || 0);
            const sessions = user.totalSessions || 0;
            const streak = user.streak || 0;
            const initials = getInitials(user.name);

            // Better check for current user
            const currentUserId = user.id || user.userId;
            const loggedInUserId = user.id || user.userId;
            const isYou = currentUserId === (user.id === user.userId ? user.id : user.userId);

            return `
                <div class="leaderboard-row ${isYou ? 'current-user' : ''}">
                    <div class="rank-col">#${index + 1}</div>
                    <div class="name-col">
                        <div class="name-avatar">${initials}</div>
                        <div class="name-text">
                            <strong>${user.name}${isYou ? ' (You)' : ''}</strong>
                            <small>${sessions} ${sessions === 1 ? 'session' : 'sessions'}</small>
                        </div>
                    </div>
                    <div class="time-col">${totalTime}</div>
                    <div class="sessions-col">${sessions} completed</div>
                    <div class="streak-col">
                        <span class="streak-icon">🔥</span>
                        <span>${streak} days</span>
                    </div>
                </div>
            `;
        })
        .join('');
};

// Display current user card
const displayCurrentUser = () => {
    const currentUserData = allLeaderboardData.find(u => {
        return (u.userId === user.id || u.id === user.id);
    });

    if (!currentUserData) {
        currentUserCard.style.display = 'none';
        return;
    }

    const rank = allLeaderboardData.indexOf(currentUserData) + 1;
    const totalTime = formatTime(currentUserData.totalSeconds || 0);
    const sessions = currentUserData.totalSessions || 0;
    const streak = currentUserData.streak || 0;

    document.getElementById('userRankBadge').textContent = rank;
    document.getElementById('currentUserName').textContent = currentUserData.name;
    document.getElementById('currentUserStats').textContent = `${sessions} sessions • ${streak} day streak 🔥`;
    document.getElementById('currentUserTime').textContent = totalTime;
    
    currentUserCard.style.display = 'flex';
};

// Filter by time period
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        displayLeaderboard();
    });
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    displayLeaderboard();
});

// Search on enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        displayLeaderboard();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchLeaderboard();
});

// Refresh leaderboard every 30 seconds
setInterval(() => {
    fetchLeaderboard();
}, 30000);
