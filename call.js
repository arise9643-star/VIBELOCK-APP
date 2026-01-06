document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const videoGrid = document.getElementById('videoGrid');
    const roomCodeDisplay = document.getElementById('roomCode');
    const participantCountBadge = document.getElementById('participantCount');
    const micBtn = document.getElementById('micBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const timerDisplay = document.querySelector('.timer-display');
    const timerStatus = document.querySelector('.timer-status');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetBtn');
    const setTimerBtn = document.getElementById('setTimerBtn');
    const timerInput = document.getElementById('timerInput');
    const timerCard = document.querySelector('.timer-card');
    const timerModeEl = document.getElementById('timerMode');
    const DING_SOUND_URL = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_75c0f7b7e1.mp3?filename=ding-36029.mp3';
    const dingAudio = new Audio(DING_SOUND_URL);
    dingAudio.volume = 1.0;
    
    // Fallback: create beep using Web Audio API
    const playBeep = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.error('Beep failed:', e);
        }
    };
    
    const playDingSound = () => {
        console.log('Playing ding sound');
        // Try the audio file first
        dingAudio.currentTime = 0;
        dingAudio.play().then(() => {
            console.log('Audio played successfully');
        }).catch((e) => {
            console.log('Audio play failed, using beep:', e);
            playBeep();
        });
    };
    
    const DEFAULT_BREAK_MINUTES = 10;
    const breakInput = document.getElementById('breakInput');
    const setBreakBtn = document.getElementById('setBreakBtn');
    const musicSelect = document.getElementById('musicSelect');
    const spotifyBtn = document.getElementById('spotifyBtn');
    const ambientTracks = {
        lofi: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3',
        rain: 'https://cdn.pixabay.com/download/audio/2021/12/08/audio_f9c59954e7.mp3?filename=rains-ambient-10174.mp3',
        white: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        forest: 'https://cdn.pixabay.com/download/audio/2022/02/16/audio_7a7348e8a8.mp3?filename=forest-sounds-ambient-9966.mp3',
        cafe: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2bbae757a9.mp3?filename=cafe-ambience-10176.mp3'
    };
    let externalMusicActive = localStorage.getItem('externalMusicActive') === 'true';
    let sessionId = null;
    let pomodorosCompleted = 0;
    
    // --- Focus Tracking Variables ---
    let focusMetrics = {
        time_focused_seconds: 0,
        time_neutral_seconds: 0,
        time_distracted_seconds: 0,
        times_left_app: 0,
        times_talked: 0,
        times_muted: 0
    };
    let lastFocusState = 'neutral';
    let focusCheckInterval = null;
    let currentPageHidden = false;

    // --- State ---
    let localStream;
    let micActive = false;
    let cameraActive = false;
    const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112778.mp3';
    const ambientAudio = new Audio();
    ambientAudio.crossOrigin = 'anonymous';
    ambientAudio.loop = true;
    ambientAudio.volume = 0.3;
    ambientAudio.src = AMBIENT_MUSIC_URL;
    
    const peerConnections = {};
    const iceCandidateQueue = {};
    const participantNames = {};
    const audioMonitors = {};
    let audioContext;
    let meetingStartedAt = null;
    let meetingTimerInterval = null;
    const roomCode = new URLSearchParams(window.location.search).get('code');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    let timerInterval;
    let timeRemaining = 0;
    let isRunning = false;
    let pomodoroMode = 'work'; // 'work' or 'break'
    let workDuration = 0;
    let breakDuration = 0;

    // --- Auth Check ---
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    if (!roomCode) {
        alert('No room code provided!');
        window.location.href = 'home.html';
        return;
    }

    const userId = user.id || user.userId;
    const userName = user.name || user.userName;

    // --- Socket.IO Connection ---
    const socket = io('http://localhost:3000');

    // --- WebRTC Configuration ---
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // --- Utility Functions ---
    const createVideoElement = (socketId, stream, participantName, isLocal = false) => {
        const videoContainer = document.createElement('div');
        videoContainer.classList.add('video-box');
        videoContainer.dataset.socketId = socketId;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        if (isLocal) {
            video.muted = true;
        }
        if (!isLocal) {
            const p = video.play();
            if (p && typeof p.then === 'function') {
                p.catch(() => {});
            }
        }
        attachAudioMonitor(stream, socketId);
        
        const nameTag = document.createElement('div');
        nameTag.classList.add('video-name');
        nameTag.textContent = participantName;

        videoContainer.appendChild(video);
        videoContainer.appendChild(nameTag);
        videoGrid.appendChild(videoContainer);
        updateVideoGrid();
        return videoContainer;
    };
    
    const updateVideoGrid = () => {
        const numParticipants = videoGrid.children.length;
        videoGrid.className = 'video-grid';
        if (numParticipants > 0) {
            videoGrid.classList.add(`participants-${numParticipants}`);
        }
    };
    
    const formatHMS = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(1, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };
    
    const startMeetingTimer = () => {
        const el = document.getElementById('sessionTimer');
        clearInterval(meetingTimerInterval);
        meetingTimerInterval = setInterval(() => {
            if (meetingStartedAt) {
                const elapsed = Math.floor((Date.now() - meetingStartedAt) / 1000);
                el.textContent = formatHMS(elapsed);
            }
        }, 1000);
    };

    const setModeUI = (mode) => {
        const isBreak = mode === 'break';
        if (timerModeEl) {
            timerModeEl.textContent = isBreak ? 'Break' : 'Pomodoro';
        }
        if (timerCard) {
            timerCard.classList.toggle('break', isBreak);
        }
    };

    const startSessionTracking = async () => {
        try {
            const resp = await fetch(`http://localhost:3000/api/rooms/${roomCode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (!resp.ok) return;
            const roomId = data.room.id;
            const pomodoroMinutes = parseInt(timerInput.value) || 45;
            const startResp = await fetch(`http://localhost:3000/api/sessions/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roomId, pomodoroMinutes })
            });
            const startData = await startResp.json();
            if (startResp.ok) {
                sessionId = startData.session.id;
                // Start monitoring focus metrics
                startFocusMonitoring();
            }
        } catch (e) {
            console.log('Session start failed', e);
        }
    };

    const endSessionTracking = async () => {
        try {
            if (!sessionId) return;
            
            // Stop focus monitoring
            if (focusCheckInterval) {
                clearInterval(focusCheckInterval);
            }
            
            // Calculate meeting duration in seconds
            let durationSeconds = 0;
            if (meetingStartedAt) {
                durationSeconds = Math.floor((Date.now() - meetingStartedAt) / 1000);
            }
            
            await fetch(`http://localhost:3000/api/sessions/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    sessionId, 
                    pomodorosCompleted, 
                    role: 'neutral',
                    durationSeconds: durationSeconds,
                    time_focused_seconds: focusMetrics.time_focused_seconds,
                    time_neutral_seconds: focusMetrics.time_neutral_seconds,
                    time_distracted_seconds: focusMetrics.time_distracted_seconds,
                    times_left_app: focusMetrics.times_left_app,
                    times_talked: focusMetrics.times_talked,
                    times_muted: focusMetrics.times_muted
                })
            });
        } catch (e) {
            console.log('Session end failed', e);
        } finally {
            sessionId = null;
            pomodorosCompleted = 0;
            focusMetrics = {
                time_focused_seconds: 0,
                time_neutral_seconds: 0,
                time_distracted_seconds: 0,
                times_left_app: 0,
                times_talked: 0,
                times_muted: 0
            };
        }
    };
    
    // Focus tracking function - determine if user is focused/neutral/distracted
    const updateFocusState = () => {
        let newFocusState = 'neutral';
        
        // Check if tab is hidden
        if (currentPageHidden) {
            newFocusState = 'distracted';
            focusMetrics.times_left_app++;
        } 
        // Check if camera is on (more likely to be focused)
        else if (cameraActive) {
            newFocusState = 'focused';
        }
        // Check if mic is on (indicate speaking/active)
        else if (micActive) {
            newFocusState = 'neutral';
            focusMetrics.times_talked++;
        }
        // Default to neutral
        else {
            newFocusState = 'neutral';
        }
        
        return newFocusState;
    };
    
    // Start monitoring focus every second
    const startFocusMonitoring = () => {
        focusCheckInterval = setInterval(() => {
            const currentFocusState = updateFocusState();
            
            // Add 1 second to appropriate metric
            if (currentFocusState === 'focused') {
                focusMetrics.time_focused_seconds++;
            } else if (currentFocusState === 'neutral') {
                focusMetrics.time_neutral_seconds++;
            } else if (currentFocusState === 'distracted') {
                focusMetrics.time_distracted_seconds++;
            }
            
            lastFocusState = currentFocusState;
        }, 1000); // Check every second
    };
    
    // Track when page visibility changes
    document.addEventListener('visibilitychange', () => {
        currentPageHidden = document.hidden;
    });
    const createPeerConnection = (targetSocketId) => {
        const peerConnection = new RTCPeerConnection(configuration);
        iceCandidateQueue[targetSocketId] = [];

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId,
                });
            }
        };

        peerConnection.ontrack = event => {
            const container = document.querySelector(`[data-socket-id="${targetSocketId}"]`);
            if (container) {
                const existingVideo = container.querySelector('video');
                if (existingVideo) {
                    existingVideo.srcObject = event.streams[0];
                    const p = existingVideo.play();
                    if (p && typeof p.then === 'function') {
                        p.catch(() => {});
                    }
                    detachAudioMonitor(targetSocketId);
                    attachAudioMonitor(event.streams[0], targetSocketId);
                }
            } else {
                const name = participantNames[targetSocketId] || 'Participant';
                createVideoElement(targetSocketId, event.streams[0], name, false);
            }
        };

        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        peerConnections[targetSocketId] = peerConnection;
        return peerConnection;
    };

    // --- Socket Event Handlers ---
    socket.on('connect', async () => {
        console.log('Connected to signaling server');
        roomCodeDisplay.textContent = roomCode;

        await startMedia();
        await startSessionTracking();

        socket.emit('join-room', { roomCode, userId, userName });
    });

    socket.on('existing-participants', (participants) => {
        console.log('Existing participants:', participants);
        participantCountBadge.textContent = (participants.length + 1).toString();
        for (const participant of participants) {
            participantNames[participant.socketId] = participant.userName || participant.userId || 'Participant';
            const peerConnection = createPeerConnection(participant.socketId);
            
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .catch(err => console.error('Offer creation failed:', err))
                .then(() => {
                    socket.emit('webrtc-offer', {
                        offer: peerConnection.localDescription,
                        targetSocketId: participant.socketId,
                    });
                });
        }
    });

    socket.on('user-joined', ({ socketId, userId, userName, participantCount: count }) => {
        console.log(`${userName} joined the room`);
        participantCountBadge.textContent = count;
        participantNames[socketId] = userName || userId || 'Participant';
    });
    
    socket.on('room-meta', ({ startedAt, participantCount }) => {
        meetingStartedAt = startedAt;
        participantCountBadge.textContent = participantCount;
        startMeetingTimer();
    });

    socket.on('webrtc-offer', async ({ offer, sourceSocketId }) => {
        console.log(`Received offer from ${sourceSocketId}`);
        const peerConnection = createPeerConnection(sourceSocketId);
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('webrtc-answer', {
                answer: peerConnection.localDescription,
                targetSocketId: sourceSocketId,
            });

            if (iceCandidateQueue[sourceSocketId]) {
                for (const candidate of iceCandidateQueue[sourceSocketId]) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
                iceCandidateQueue[sourceSocketId] = [];
            }
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    });

    socket.on('webrtc-answer', async ({ answer, sourceSocketId }) => {
        console.log(`Received answer from ${sourceSocketId}`);
        const peerConnection = peerConnections[sourceSocketId];
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            
            if (iceCandidateQueue[sourceSocketId]) {
                for (const candidate of iceCandidateQueue[sourceSocketId]) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
                iceCandidateQueue[sourceSocketId] = [];
            }
        } catch (err) {
            console.error('Error handling answer:', err);
        }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate, sourceSocketId }) => {
        console.log(`Received ICE candidate from ${sourceSocketId}`);
        const peerConnection = peerConnections[sourceSocketId];
        
        if (peerConnection) {
            try {
                if (peerConnection.remoteDescription === null) {
                    if (!iceCandidateQueue[sourceSocketId]) {
                        iceCandidateQueue[sourceSocketId] = [];
                    }
                    iceCandidateQueue[sourceSocketId].push(candidate);
                } else {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        }
    });

    socket.on('user-left', ({ socketId, participantCount: count }) => {
        console.log(`User ${socketId} left the room`);
        if (count !== undefined) {
            participantCountBadge.textContent = count;
        }
        if (peerConnections[socketId]) {
            peerConnections[socketId].close();
            delete peerConnections[socketId];
        }
        detachAudioMonitor(socketId);
        const videoToRemove = document.querySelector(`[data-socket-id="${socketId}"]`);
        if (videoToRemove) {
            videoToRemove.remove();
        }
        updateVideoGrid();
    });

    // --- Media and Controls ---
    const startMedia = async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: true 
            });
            
            // Initialize tracks to disabled (off) state
            localStream.getAudioTracks().forEach(track => track.enabled = false);
            localStream.getVideoTracks().forEach(track => track.enabled = false);

            // Update UI to reflect initial off state
            micBtn.classList.remove('active');
            micBtn.querySelector('span').textContent = 'Unmute';
            cameraBtn.classList.remove('active');
            cameraBtn.querySelector('span').textContent = 'Camera On';

            createVideoElement(socket.id, localStream, 'You (Local)', true);
            attachAudioMonitor(localStream, socket.id);
            console.log('Media started successfully');

            // Try to start ambient music since mic is muted initially
            try {
                const selected = (musicSelect && musicSelect.value) || 'lofi';
                const trackUrl = ambientTracks[selected] || ambientTracks.lofi;
                ambientAudio.src = trackUrl;
                ambientAudio.load();
                if (!externalMusicActive) {
                    ambientAudio.play().then(() => {
                        console.log('Ambient music started:', selected);
                    }).catch(err => {
                        console.log('Music autoplay blocked (will play on first interaction):', err);
                    });
                }
            } catch (err) {
                console.log('Music setup error:', err);
            }
        } catch (error) {
            console.error('Error accessing media devices:', error);
            if (error.name === 'NotAllowedError') {
                alert('Camera/microphone permission denied. You can still join but video will be disabled.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera/microphone found on this device.');
            } else {
                alert('Could not access camera and microphone.');
            }
        }
    };

    micBtn.addEventListener('click', () => {
        if (localStream && localStream.getAudioTracks().length > 0) {
            micActive = !micActive;
            localStream.getAudioTracks()[0].enabled = micActive;
            micBtn.classList.toggle('active', micActive);
            micBtn.querySelector('span').textContent = micActive ? 'Mute' : 'Unmute';
            
            // Toggle ambient music based on mic state
            if (micActive) {
                // Mic is ON -> Stop music
                ambientAudio.pause();
            } else {
                // Mic is OFF (Muted) -> Play music
                if (!externalMusicActive) {
                    ambientAudio.play().catch(e => {
                        console.log('Music play on mic toggle failed:', e.message);
                    });
                }
            }
        }
    });

    cameraBtn.addEventListener('click', () => {
        if (localStream && localStream.getVideoTracks().length > 0) {
            cameraActive = !cameraActive;
            localStream.getVideoTracks()[0].enabled = cameraActive;
            cameraBtn.classList.toggle('active', cameraActive);
            cameraBtn.querySelector('span').textContent = cameraActive ? 'Camera Off' : 'Camera On';
        }
    });

    leaveBtn.addEventListener('click', () => {
        if (confirm('Are you sure? Your session will end.')) {
            socket.emit('leave-room', { roomCode });
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            for (const peerId in peerConnections) {
                peerConnections[peerId].close();
            }
            socket.disconnect();
            endSessionTracking();
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 500);
        }
    });

    // --- Timer Logic ---
    const updateTimerDisplay = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = Math.floor(timeRemaining % 60);
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeRemaining > 300) {
            timerDisplay.style.color = '#4ECDC4';
        } else if (timeRemaining > 60) {
            timerDisplay.style.color = '#ffc107';
        } else {
            timerDisplay.style.color = '#ff6b6b';
        }
    };

    const startTimer = (duration) => {
        workDuration = duration;
        timeRemaining = duration;
        isRunning = true;
        timerStatus.textContent = '🍅 Working...';
        timerStatus.className = 'timer-status running';
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                completePhase();
            }
        }, 1000);
    };
    
    const completePhase = () => {
        clearInterval(timerInterval);
        isRunning = false;
        
        // Play ding sound
        playDingSound();
        
        if (pomodoroMode === 'work') {
            pomodorosCompleted++;
            timerStatus.textContent = '✅ Work Complete! Click START for break';
            timerStatus.className = 'timer-status complete';
            pomodoroMode = 'break';
        } else {
            timerStatus.textContent = '☕ Break Complete!';
            timerStatus.className = 'timer-status complete';
            pomodoroMode = 'work';
        }
        
        timeRemaining = 0;
        updateTimerDisplay();
    };

    startTimerBtn.addEventListener('click', () => {
        if (isRunning) {
            // Pause
            clearInterval(timerInterval);
            isRunning = false;
            timerStatus.textContent = 'Paused';
            timerStatus.className = 'timer-status paused';
            return;
        }
        
        // If in break mode, use break duration
        if (pomodoroMode === 'break') {
            const breakMinutes = parseInt(breakInput?.value || DEFAULT_BREAK_MINUTES);
            if (breakMinutes && breakMinutes > 0) {
                const duration = breakMinutes * 60;
                timeRemaining = duration;
                workDuration = duration;
                isRunning = true;
                timerStatus.textContent = '☕ Break Time...';
                timerStatus.className = 'timer-status running';
                clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timeRemaining--;
                    updateTimerDisplay();
                    if (timeRemaining <= 0) {
                        completePhase();
                    }
                }, 1000);
                socket.emit('timer-start', { roomCode, duration, mode: 'break' });
                return;
            }
        }
        
        // Work mode
        const minutes = parseInt(timerInput.value);
        const breakMinutes = parseInt(breakInput?.value || DEFAULT_BREAK_MINUTES);
        if (minutes && minutes > 0 && minutes <= 120) {
            const duration = minutes * 60;
            pomodoroMode = 'work';
            startTimer(duration);
            socket.emit('timer-start', { roomCode, duration, mode: 'pomodoro', breakDuration: breakMinutes * 60 });
        } else {
            alert('Please enter a valid time between 1 and 120 minutes');
        }
    });

    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        isRunning = false;
        pomodoroMode = 'work';
        timeRemaining = 0;
        timerStatus.textContent = 'Reset';
        timerStatus.className = 'timer-status';
        updateTimerDisplay();
        socket.emit('timer-reset', { roomCode });
    });

    setTimerBtn.addEventListener('click', () => {
        const minutes = parseInt(timerInput.value);
        const breakMinutes = parseInt(breakInput?.value || DEFAULT_BREAK_MINUTES);
        if (minutes && minutes > 0 && minutes <= 120) {
            const duration = minutes * 60;
            socket.emit('timer-set', { roomCode, duration, breakDuration: breakMinutes * 60 });
        } else {
            alert('Please enter a valid time between 1 and 120 minutes');
        }
    });

    timerInput.addEventListener('change', () => {
        const minutes = parseInt(timerInput.value);
        if (minutes && minutes > 0 && minutes <= 120) {
            const duration = minutes * 60;
            const breakMinutes = parseInt(breakInput?.value || DEFAULT_BREAK_MINUTES);
            socket.emit('timer-set', { roomCode, duration, breakDuration: breakMinutes * 60 });
        }
    });

    setBreakBtn.addEventListener('click', () => {
        const minutes = parseInt(timerInput.value);
        const breakMinutes = parseInt(breakInput?.value || DEFAULT_BREAK_MINUTES);
        if (breakMinutes && breakMinutes > 0 && breakMinutes <= 60) {
            const duration = minutes && minutes > 0 && minutes <= 120 ? minutes * 60 : (45 * 60);
            socket.emit('timer-set', { roomCode, duration, breakDuration: breakMinutes * 60 });
        } else {
            alert('Please enter a valid break time between 1 and 60 minutes');
        }
    });

    socket.on('timer-started', (timer) => {
        setModeUI(timer.mode || 'pomodoro');
        startTimer(timer.timeRemaining);
    });

    socket.on('timer-paused', (timer) => {
        clearInterval(timerInterval);
        isRunning = false;
        timeRemaining = timer.timeRemaining;
        updateTimerDisplay();
        timerStatus.textContent = 'Paused';
        timerStatus.className = 'timer-status paused';
    });
    
    socket.on('timer-resumed', (timer) => {
        setModeUI(timer.mode || 'pomodoro');
        startTimer(timer.timeRemaining);
    });

    socket.on('timer-reset', () => {
        clearInterval(timerInterval);
        isRunning = false;
        timeRemaining = 0;
        updateTimerDisplay();
        timerStatus.textContent = 'Ready';
        timerStatus.className = 'timer-status';
        setModeUI('pomodoro');
    });

    socket.on('timer-sync', (timer) => {
        if (timer.isRunning) {
            const elapsedTime = (Date.now() - timer.startedAt) / 1000;
            const remaining = timer.timeRemaining - elapsedTime;
            setModeUI(timer.mode || 'pomodoro');
            startTimer(remaining > 0 ? remaining : 0);
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            timeRemaining = timer.timeRemaining || 0;
            updateTimerDisplay();
            timerStatus.textContent = timeRemaining > 0 ? 'Paused' : 'Ready';
            timerStatus.className = 'timer-status';
            setModeUI(timer.mode || 'pomodoro');
        }
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        alert('Connection error: ' + error);
    });

    socket.on('disconnect', () => {
        console.warn('Disconnected from server');
        clearInterval(meetingTimerInterval);
    });

    const enableRemoteAudio = () => {
        if (audioContext && audioContext.state !== 'running') {
            audioContext.resume().catch(() => {});
        }
        // Try to play ambient music if muted (which is default)
        if (!micActive && !externalMusicActive) {
            ambientAudio.play().catch(err => {
                console.log('Music play on interaction failed:', err.message);
            });
        }
        const videos = videoGrid.querySelectorAll('video');
        videos.forEach(v => {
            if (!v.muted) {
                const p = v.play();
                if (p && typeof p.then === 'function') {
                    p.catch(() => {});
                }
            }
        });
    };
    document.body.addEventListener('click', enableRemoteAudio, { once: true });
    window.addEventListener('beforeunload', () => {
        endSessionTracking();
    });

    if (musicSelect) {
        musicSelect.addEventListener('change', () => {
            const key = musicSelect.value;
            console.log('Changing music to:', key);
            ambientAudio.pause();
            const trackUrl = ambientTracks[key] || ambientTracks.lofi;
            ambientAudio.src = trackUrl;
            ambientAudio.load();
            if (!micActive && !externalMusicActive) {
                ambientAudio.play().then(() => {
                    console.log('New track playing:', key);
                }).catch(err => {
                    console.log('Failed to play track:', err.message);
                });
            }
            localStorage.setItem('ambientTrack', key);
        });
        const saved = localStorage.getItem('ambientTrack');
        if (saved && ambientTracks[saved]) {
            musicSelect.value = saved;
            ambientAudio.src = ambientTracks[saved];
        }
    }

    if (spotifyBtn) {
        spotifyBtn.addEventListener('click', () => {
            console.log('Opening Spotify');
            externalMusicActive = true;
            localStorage.setItem('externalMusicActive', 'true');
            ambientAudio.pause();
            window.open('https://open.spotify.com/', '_blank');
        });
    }

    const attachAudioMonitor = (stream, socketId) => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        const data = new Float32Array(analyser.fftSize);
        source.connect(analyser);
        const loop = () => {
            analyser.getFloatTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                const v = data[i];
                sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const container = document.querySelector(`[data-socket-id="${socketId}"]`);
            if (container) {
                if (rms > 0.02) {
                    container.classList.add('speaking');
                } else {
                    container.classList.remove('speaking');
                }
            }
            audioMonitors[socketId].rafId = requestAnimationFrame(loop);
        };
        audioMonitors[socketId] = { source, analyser, rafId: requestAnimationFrame(loop) };
    };

    const detachAudioMonitor = (socketId) => {
        const monitor = audioMonitors[socketId];
        if (monitor) {
            cancelAnimationFrame(monitor.rafId);
            try {
                monitor.source.disconnect();
                monitor.analyser.disconnect();
            } catch {}
            delete audioMonitors[socketId];
        }
        const container = document.querySelector(`[data-socket-id="${socketId}"]`);
        if (container) {
            container.classList.remove('speaking');
        }
    };
});

