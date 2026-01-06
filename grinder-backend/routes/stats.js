const express = require('express');
const router = express.Router();
const { getUserStats, getLeaderboard } = require('../controllers/statsController');
const authMiddleware = require('../middleware/auth');

router.get('/user', authMiddleware, getUserStats);
router.get('/leaderboard', getLeaderboard);

module.exports = router;