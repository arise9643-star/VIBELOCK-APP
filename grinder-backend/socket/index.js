const activeRooms = new Map();

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // When a user joins a room
    socket.on('join-room', ({ roomCode, userId, userName }) => {
      socket.join(roomCode);

      if (!activeRooms.has(roomCode)) {
        activeRooms.set(roomCode, {
          participants: new Map(),
          timer: { timeRemaining: 0, isRunning: false },
          startedAt: Date.now()
        });
      }

      const room = activeRooms.get(roomCode);
      room.participants.set(socket.id, { userId, userName });

      // Notify other users in the room about the new user
      socket.to(roomCode).emit('user-joined', {
        socketId: socket.id,
        userId,
        userName,
        participantCount: room.participants.size
      });

      // Send the list of existing participants to the new user
      const existingParticipants = [];
      for (const [socketId, participant] of room.participants) {
        if (socketId !== socket.id) {
          existingParticipants.push({ socketId, ...participant });
        }
      }
      socket.emit('existing-participants', existingParticipants);

      socket.emit('room-meta', {
        startedAt: room.startedAt,
        participantCount: room.participants.size
      });

      // Send current timer state to the new user
      socket.emit('timer-sync', room.timer);

      console.log(`User ${userName} (${userId}) joined room ${roomCode}`);
    });

    // WebRTC signaling: offer, answer, and ICE candidate
    socket.on('webrtc-offer', ({ offer, targetSocketId }) => {
        socket.to(targetSocketId).emit('webrtc-offer', { offer, sourceSocketId: socket.id });
    });

    socket.on('webrtc-answer', ({ answer, targetSocketId }) => {
        socket.to(targetSocketId).emit('webrtc-answer', { answer, sourceSocketId: socket.id });
    });

    socket.on('webrtc-ice-candidate', ({ candidate, targetSocketId }) => {
        socket.to(targetSocketId).emit('webrtc-ice-candidate', { candidate, sourceSocketId: socket.id });
    });

    // Pomodoro timer events
    socket.on('timer-start', ({ roomCode, duration, mode, breakDuration }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        const m = mode || (room.timer.mode || 'pomodoro');
        const pd = duration || room.timer.pomodoroDuration || 2700;
        const bd = breakDuration || room.timer.breakDuration || 600;
        const tr = m === 'break' ? bd : pd;
        room.timer = {
          timeRemaining: tr,
          isRunning: true,
          startedAt: Date.now(),
          mode: m,
          pomodoroDuration: pd,
          breakDuration: bd
        };
        io.to(roomCode).emit('timer-started', room.timer);
        console.log(`Timer started in room ${roomCode}`);
      }
    });

    socket.on('timer-pause', ({ roomCode }) => {
        const room = activeRooms.get(roomCode);
        if (room && room.timer.isRunning) {
            const elapsedTime = (Date.now() - room.timer.startedAt) / 1000;
            room.timer.timeRemaining -= elapsedTime;
            room.timer.isRunning = false;
            io.to(roomCode).emit('timer-paused', { timeRemaining: room.timer.timeRemaining });
            console.log(`Timer paused in room ${roomCode}`);
        }
    });

    socket.on('timer-resume', ({ roomCode }) => {
        const room = activeRooms.get(roomCode);
        if (room && !room.timer.isRunning) {
            room.timer.isRunning = true;
            room.timer.startedAt = Date.now();
            io.to(roomCode).emit('timer-resumed', room.timer);
            console.log(`Timer resumed in room ${roomCode}`);
        }
    });

    socket.on('timer-reset', ({ roomCode }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.timer = { timeRemaining: 0, isRunning: false, mode: 'pomodoro', pomodoroDuration: room.timer?.pomodoroDuration || 2700, breakDuration: room.timer?.breakDuration || 600 };
        io.to(roomCode).emit('timer-reset');
        console.log(`Timer reset in room ${roomCode}`);
      }
    });

    socket.on('timer-set', ({ roomCode, duration, breakDuration }) => {
        const room = activeRooms.get(roomCode);
        if(room) {
            room.timer.timeRemaining = duration;
            room.timer.isRunning = false;
            room.timer.pomodoroDuration = duration;
            if (breakDuration) room.timer.breakDuration = breakDuration;
            io.to(roomCode).emit('timer-sync', room.timer);
        }
    });

    socket.on('timer-finish', ({ roomCode }) => {
      const room = activeRooms.get(roomCode);
      if (room && room.timer) {
        const nextMode = (room.timer.mode || 'pomodoro') === 'pomodoro' ? 'break' : 'pomodoro';
        const pd = room.timer.pomodoroDuration || 2700;
        const bd = room.timer.breakDuration || 600;
        const tr = nextMode === 'break' ? bd : pd;
        room.timer = {
          timeRemaining: tr,
          isRunning: true,
          startedAt: Date.now(),
          mode: nextMode,
          pomodoroDuration: pd,
          breakDuration: bd
        };
        io.to(roomCode).emit('timer-started', room.timer);
      }
    });

    // Chat messages
    socket.on('chat-message', ({ roomCode, message }) => {
        const room = activeRooms.get(roomCode);
        if (room && room.participants.has(socket.id)) {
            const participant = room.participants.get(socket.id);
            io.to(roomCode).emit('chat-message', {
                userId: participant.userId,
                userName: participant.userName,
                message,
                timestamp: new Date().toISOString()
            });
        }
    });

    const handleLeaveRoom = (roomCode) => {
        const room = activeRooms.get(roomCode);
        if (room && room.participants.has(socket.id)) {
            const participant = room.participants.get(socket.id);
            room.participants.delete(socket.id);

            io.to(roomCode).emit('user-left', {
                socketId: socket.id,
                userId: participant.userId,
                userName: participant.userName,
                participantCount: room.participants.size
            });

            console.log(`User ${participant.userName} (${participant.userId}) left room ${roomCode}`);

            if (room.participants.size === 0) {
                activeRooms.delete(roomCode);
                console.log(`Room ${roomCode} is now empty and has been removed.`);
            }
        }
    };

    socket.on('leave-room', ({ roomCode }) => {
        handleLeaveRoom(roomCode);
    });


    // When a user disconnects
    socket.on('disconnecting', () => {
      console.log('User disconnecting:', socket.id);
      for (const roomCode of socket.rooms) {
          if(roomCode !== socket.id) {
            handleLeaveRoom(roomCode);
          }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = initializeSocket;
