const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// @route   POST /api/alerts
// @desc    Create a new alert
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const {
            coinId,
            coinSymbol,
            coinName,
            type,
            targetPrice,
            rangeMin,
            rangeMax,
            percentageThreshold,
            referencePrice,
            expiresAt
        } = req.body;

        // Validation
        if (!coinId || !coinSymbol || !type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate based on alert type
        if ((type === 'price_above' || type === 'price_below') && !targetPrice) {
            return res.status(400).json({ message: 'Target price required for this alert type' });
        }
        if (type === 'price_range' && (!rangeMin || !rangeMax)) {
            return res.status(400).json({ message: 'Range min and max required for range alerts' });
        }
        if ((type === 'pct_increase' || type === 'pct_decrease') && !percentageThreshold) {
            return res.status(400).json({ message: 'Percentage threshold required for percentage alerts' });
        }

        const alert = new Alert({
            userId: req.user.id,
            coinId,
            coinSymbol: coinSymbol.toUpperCase(),
            coinName: coinName || coinSymbol,
            type,
            targetPrice,
            rangeMin,
            rangeMax,
            percentageThreshold,
            referencePrice: referencePrice || targetPrice,
            expiresAt
        });

        await alert.save();
        res.status(201).json({ message: 'Alert created successfully', alert });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/alerts
// @desc    Get all alerts for current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, coinId } = req.query;

        const query = { userId: req.user.id };
        if (status) query.status = status;
        if (coinId) query.coinId = coinId;

        const alerts = await Alert.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ alerts });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/alerts/count
// @desc    Get count of active alerts for current user
// @access  Private
router.get('/count', auth, async (req, res) => {
    try {
        const count = await Alert.countDocuments({
            userId: req.user.id,
            status: 'active'
        });
        res.json({ count });
    } catch (error) {
        console.error('Error counting alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/alerts/:id
// @desc    Update an alert (pause/resume/edit)
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const alert = await Alert.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        const { status, targetPrice, rangeMin, rangeMax, percentageThreshold } = req.body;

        if (status) alert.status = status;
        if (targetPrice) alert.targetPrice = targetPrice;
        if (rangeMin) alert.rangeMin = rangeMin;
        if (rangeMax) alert.rangeMax = rangeMax;
        if (percentageThreshold) alert.percentageThreshold = percentageThreshold;

        await alert.save();
        res.json({ message: 'Alert updated', alert });
    } catch (error) {
        console.error('Error updating alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete an alert
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const alert = await Alert.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted' });
    } catch (error) {
        console.error('Error deleting alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/alerts/triggered
// @desc    Get recently triggered alerts (for notifications)
// @access  Private
router.get('/triggered', auth, async (req, res) => {
    try {
        const alerts = await Alert.find({
            userId: req.user.id,
            status: 'triggered',
            notificationSent: false
        }).sort({ triggeredAt: -1 }).limit(10);

        // Mark as notification sent
        await Alert.updateMany(
            { _id: { $in: alerts.map(a => a._id) } },
            { notificationSent: true }
        );

        res.json({ alerts });
    } catch (error) {
        console.error('Error fetching triggered alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
