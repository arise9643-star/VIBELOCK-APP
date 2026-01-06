const express = require('express');
const router = express.Router();
const { startSession, endSession, getHistory } = require('../controllers/sessionController');
const authMiddleware = require('../middleware/auth');

router.post('/start', authMiddleware, startSession);
router.post('/end', authMiddleware, endSession);
router.get('/history', authMiddleware, getHistory);

module.exports = router;