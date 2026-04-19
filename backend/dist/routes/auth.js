"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Mock Login for testing Day 2
router.post('/login', (req, res) => {
    const { email } = req.body;
    // In a real app, verify password here
    const token = jsonwebtoken_1.default.sign({ userId: "some-test-uuid", email }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '24h' });
    res.json({ success: true, token });
});
exports.default = router;
