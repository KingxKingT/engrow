const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, email_verify_token, email_verify_expires)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, email_verified`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, verifyToken, verifyExpires]
    );

    const user = result.rows[0];

    // Initialize skill levels
    const skills = ['grammar', 'vocabulary', 'reading', 'writing', 'dialogue'];
    for (const skill of skills) {
      await pool.query(
        'INSERT INTO user_skill_levels (user_id, skill, cefr_level) VALUES ($1, $2, $3)',
        [user.id, skill, 'A1']
      );
    }

    // Initialize streak
    await pool.query(
      'INSERT INTO user_streaks (user_id) VALUES ($1)',
      [user.id]
    );

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.email_verified },
      needsPlacementTest: true,
      verifyToken
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, email_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Check if user has completed placement test
    const testResult = await pool.query(
      'SELECT id, status FROM placement_tests WHERE user_id = $1 ORDER BY started_at DESC LIMIT 1',
      [user.id]
    );

    const hasCompletedTest = testResult.rows.length > 0 && testResult.rows[0].status === 'completed';

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.email_verified },
      needsPlacementTest: !hasCompletedTest
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const result = await pool.query(
      `SELECT id FROM users 
       WHERE email_verify_token = $1 AND email_verify_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await pool.query(
      `UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires = NULL
       WHERE id = $1`,
      [result.rows[0].id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3`,
      [verifyToken, verifyExpires, req.user.userId]
    );

    res.json({ message: 'Verification email sent', verifyToken });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, result.rows[0].id]
    );

    res.json({ message: 'If an account exists, a reset link has been sent', resetToken });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE users SET password_hash = $1, reset_password_token = NULL, 
       reset_password_expires = NULL WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, email_verified, dyslexia_font, high_contrast, 
       simplified_first, font_size, daily_reminder, reminder_time, weekly_goal, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get skill levels
    const skillsResult = await pool.query(
      'SELECT skill, cefr_level, cefr_sublevel, xp FROM user_skill_levels WHERE user_id = $1',
      [user.id]
    );

    // Get streak
    const streakResult = await pool.query(
      'SELECT current_streak, longest_streak, last_study_date FROM user_streaks WHERE user_id = $1',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.email_verified,
        settings: {
          dyslexiaFont: user.dyslexia_font,
          highContrast: user.high_contrast,
          simplifiedFirst: user.simplified_first,
          fontSize: user.font_size,
          dailyReminder: user.daily_reminder,
          reminderTime: user.reminder_time,
          weeklyGoal: user.weekly_goal
        },
        createdAt: user.created_at
      },
      skills: skillsResult.rows,
      streak: streakResult.rows[0] || { currentStreak: 0, longestStreak: 0 }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
