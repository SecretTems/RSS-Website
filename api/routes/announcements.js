const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Announcement = require('../models/Announcement');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/announcements - public
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username');
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/announcements - admin only
router.post(
  '/',
  protect,
  adminOnly,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
    body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 2000 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const announcement = await Announcement.create({
        title: req.body.title,
        content: req.body.content,
        author: req.user._id
      });
      await announcement.populate('author', 'username');
      res.status(201).json({ success: true, data: announcement });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

// PATCH /api/announcements/:id/like
router.patch('/:id/like', protect, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ success: false, message: 'Not found.' });

    const idx = ann.likes.indexOf(req.user._id);
    if (idx === -1) ann.likes.push(req.user._id);
    else ann.likes.splice(idx, 1);
    await ann.save();

    res.json({ success: true, likes: ann.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PATCH /api/announcements/:id/heart
router.patch('/:id/heart', protect, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ success: false, message: 'Not found.' });

    const idx = ann.hearts.indexOf(req.user._id);
    if (idx === -1) ann.hearts.push(req.user._id);
    else ann.hearts.splice(idx, 1);
    await ann.save();

    res.json({ success: true, hearts: ann.hearts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/announcements/:id - admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
