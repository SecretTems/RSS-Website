const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// GET /api/bookings/my - get current user's bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .sort({ date: -1, startTime: 1 })
      .populate('room', 'name number');
    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/bookings - create a booking
router.post(
  '/',
  protect,
  [
    body('roomId').notEmpty().withMessage('Room is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('startTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Start time must be HH:MM'),
    body('endTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('End time must be HH:MM')
      .custom((value, { req }) => {
        if (value <= req.body.startTime) throw new Error('End time must be after start time');
        return true;
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { roomId, date, startTime, endTime, purpose } = req.body;

      const room = await Room.findById(roomId);
      if (!room || !room.isActive) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }

      const bookingDate = new Date(date);
      const dayStart = new Date(bookingDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(bookingDate.setHours(23, 59, 59, 999));

      // Check for conflicts
      const conflict = await Booking.findOne({
        room: roomId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['confirmed', 'occupied'] },
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Room is already booked from ${conflict.startTime} to ${conflict.endTime}.`
        });
      }

      const booking = await Booking.create({
        user: req.user._id,
        room: roomId,
        date: new Date(date),
        startTime,
        endTime,
        purpose: purpose || '',
        status: 'confirmed'
      });

      await booking.populate('room', 'name number');
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  }
);

// DELETE /api/bookings/:id - cancel a booking
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
