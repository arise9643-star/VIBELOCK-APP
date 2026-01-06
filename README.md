# 🔥 VIBELOCK - Focus-Based Video Conferencing

A modern, distraction-free video conferencing app with built-in **Pomodoro timer**, **focus tracking**, and **ambient music** to maximize productivity.

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-informational)

---

## ✨ Features

- 🎥 **WebRTC Video Conferencing** - Crystal clear peer-to-peer video calls
- ⏱️ **Smart Pomodoro Timer** - 45min work + 10min breaks with sound alerts
- 🎯 **Focus Tracking** - Automatic detection of focus/neutral/distracted states
- 🎵 **Ambient Music** - 5 study tracks (Lofi, Rain, White Noise, Forest, Café)
- 📊 **Analytics Dashboard** - Track sessions, focus time, and performance
- ☁️ **Cloud Sync** - All data synced via Supabase PostgreSQL
- 🔐 **Secure Auth** - JWT-based authentication
- 📱 **Responsive Design** - Works on desktop and tablet

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- PostgreSQL (or Supabase)
- Modern browser (Chrome, Firefox, Edge)

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/vibelock.git
cd vibelock
```

**2. Setup Backend:**
```bash
cd vibelock-backend
npm install
```

**3. Configure environment variables (.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/vibelock
JWT_SECRET=your_secret_key
PORT=3000
```

**4. Start backend server:**
```bash
node server.js
```

**5. Open frontend (in new terminal):**
```bash
# From project root
# Open call.html, home.html, etc. in a browser
# Or use Live Server extension in VS Code
```

**6. Access the app:**
- Home: `http://localhost:PORT/home.html`
- Reports: `http://localhost:PORT/report.html`
- Create/Join Room: Use room codes from UI

---

## 📖 How to Use

### Creating a Session
1. Go to **Home** page
2. Click **"Create a Room"**
3. Share the room code with others
4. Start the Pomodoro timer
5. Invite participants to join

### During a Session
- **Camera/Mic Buttons**: Toggle video and audio
- **Pomodoro Timer**: Start work session → ding → switch to break
- **Music Selector**: Choose ambient track (automatically plays when muted)
- **Focus Metrics**: Automatically tracked based on camera/mic status

### Viewing Analytics
- **Reports Page**: Session stats, focus distribution, achievements
- **History Page**: Timeline of all completed sessions
- **Home Dashboard**: Quick stats and streak tracking

---

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (no frameworks)
- HTML5 + CSS3
- WebRTC (RTCPeerConnection)
- Socket.io (WebRTC signaling)

**Backend:**
- Node.js + Express
- PostgreSQL / Supabase
- Socket.io
- JWT Authentication

**Database Schema:**
- Users (email, password, profile)
- Sessions (duration, focus metrics, timestamps)
- Stats (aggregated user metrics)

---

## 📊 Focus Tracking Algorithm

The app automatically detects focus state every second:

| State | Condition | Detection |
|-------|-----------|-----------|
| 🟢 **Focused** | Camera ON | Video feed active |
| 🟡 **Neutral** | Mic ON or Idle | Audio present or no activity |
| 🔴 **Distracted** | Tab Hidden | User switched tabs |

Metrics tracked:
- `time_focused_seconds` - Total focused time
- `time_neutral_seconds` - Neutral activity time
- `time_distracted_seconds` - Time away from app
- `times_left_app` - Number of tab switches
- `times_talked` - Conversation moments detected
- `times_muted` - How many times mic was muted

---

## 🎵 Ambient Tracks

Select from 5 study music options:
1. **Lofi Study** - Chill beats for focus
2. **Rain Ambient** - Calming rain sounds
3. **White Noise** - Background static
4. **Forest Ambience** - Nature sounds
5. **Café Ambience** - Coffee shop background

Music auto-plays when **mic is muted** and pauses when **mic is unmuted**. Open Spotify simultaneously for your own tracks!

---

## 🔔 Pomodoro Timer

**Work Phase:** 45 minutes (default, customizable)
- ✅ Focus on tasks
- 📊 Metrics tracked
- 🔴 Timer shows work mode

**Break Phase:** 10 minutes (default, customizable)
- ☕ Rest and recharge
- 🎵 Music continues
- 🟠 Timer shows break mode

**Audio Cue:** Ding sound plays at end of each phase + optional beep fallback

---

## 📈 Analytics

Track your productivity:
- **Total Sessions** - Count of completed sessions
- **Total Focus Time** - Hours spent focused
- **Average Session** - Duration per session
- **Pomodoros Completed** - Timer cycles finished
- **Focus Distribution** - Pie chart of focus/neutral/distracted
- **Weekly Activity** - Bar chart of sessions per day
- **Achievements** - Badges for milestones

---

## 🔐 Security

- ✅ JWT token-based authentication
- ✅ Passwords hashed with bcrypt
- ✅ HTTPS-ready (use with reverse proxy in production)
- ✅ CORS configured for localhost/production
- ✅ SQL injection prevention via parameterized queries

---

## 🐛 Troubleshooting

### Music won't play?
- Check browser autoplay policy (allow in settings)
- Click anywhere on page to enable sound
- Try a different track from selector

### Video/Audio not working?
- Verify camera/mic permissions in browser
- Check that mic/camera buttons show "active" state
- Restart the session

### Timer sound not working?
- Enable audio in browser (check volume)
- Uses Web Audio API fallback if CDN unavailable
- Check console for audio errors

### Backend not connecting?
- Verify `PORT=3000` in .env
- Check database URL is correct
- Ensure PostgreSQL/Supabase is running
- Check Socket.io connection in browser console

---

## 📂 Project Structure

```
vibelock-frontend/
├── index.html              # Login page
├── home.html               # Dashboard
├── call.html               # Video session
├── report.html             # Analytics
├── history.html            # Session timeline
├── *.css                   # Styling
├── *.js                    # JavaScript logic
└── vibelock-backend/
    ├── server.js           # Express server
    ├── config/             # Database config
    ├── controllers/        # API controllers
    ├── routes/             # API routes
    ├── middleware/         # Auth middleware
    └── socket/             # WebRTC signaling
```

---

## 🚀 Deployment

### Deploy Frontend
- GitHub Pages (static files)
- Vercel
- Netlify
- Any static hosting

### Deploy Backend
- Heroku
- Railway
- AWS EC2
- DigitalOcean
- Render

**Pro Tip:** Use environment variables for different API endpoints (dev vs. production)

---

## 📝 License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via GitHub Issues
- Suggest features
- Submit pull requests
- Improve documentation

---

## 💬 Support

Have questions? Issues?
- Check the [Troubleshooting](#-troubleshooting) section
- Open a GitHub Issue
- Review the code comments for implementation details

---

## 🎯 Roadmap

Future features planned:
- [ ] Screen sharing
- [ ] Recording sessions
- [ ] Chat/messaging
- [ ] Custom branding
- [ ] Team analytics
- [ ] Mobile app
- [ ] Dark/light theme toggle

---

## 👨‍💻 Author

Built with ❤️ for focus and productivity.

---

**Last Updated:** January 2026  
**Version:** 1.0.0
