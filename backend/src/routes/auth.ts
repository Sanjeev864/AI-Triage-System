import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// Mock Login for testing Day 2
router.post('/login', (req, res) => {
    const { email } = req.body;
    // In a real app, verify password here
    const token = jwt.sign(
        { userId: "some-test-uuid", email },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '24h' }
    );
    res.json({ success: true, token });
});

export default router;