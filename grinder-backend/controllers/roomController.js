const { query } = require('../config/database');

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;
    
    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    
    let roomCode;
    let isUnique = false;
    
    while (!isUnique) {
      roomCode = generateRoomCode();
      const existing = await query(
        'SELECT id FROM rooms WHERE code = $1',
        [roomCode]
      );
      if (existing.rows.length === 0) {
        isUnique = true;
      }
    }
    
    const result = await query(
      'INSERT INTO rooms (code, name, host_id, created_at, is_active) VALUES ($1, $2, $3, NOW(), true) RETURNING *',
      [roomCode, name, userId]
    );
    
    const room = result.rows[0];
    
    res.status(201).json({
      message: 'Room created successfully',
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: room.host_id,
        createdAt: room.created_at
      }
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Server error creating room' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;
    
    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }
    
    const roomResult = await query(
      'SELECT * FROM rooms WHERE code = $1 AND is_active = true',
      [code.toUpperCase()]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }
    
    const room = roomResult.rows[0];
    
    await query(
      'INSERT INTO room_participants (room_id, user_id, joined_at) VALUES ($1, $2, NOW()) ON CONFLICT (room_id, user_id) DO UPDATE SET joined_at = NOW()',
      [room.id, userId]
    );
    
    res.json({
      message: 'Joined room successfully',
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: room.host_id
      }
    });
    
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Server error joining room' });
  }
};

const getRoom = async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await query(
      'SELECT * FROM rooms WHERE code = $1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = result.rows[0];
    
    const participantsResult = await query(
      'SELECT COUNT(*) FROM room_participants WHERE room_id = $1',
      [room.id]
    );
    
    res.json({
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: room.host_id,
        isActive: room.is_active,
        participantCount: parseInt(participantsResult.rows[0].count),
        createdAt: room.created_at
      }
    });
    
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { createRoom, joinRoom, getRoom };