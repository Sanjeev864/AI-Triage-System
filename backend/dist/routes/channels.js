"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const diagnostics_channel_1 = require("diagnostics_channel");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authMiddleware);
/**
 * POST /api/channels
 * Create a new channel for an incident
 * Body: { incidentId, name }
 */
router.post('/', async (req, res) => {
    try {
        const { incidentId, name, userId } = req.body;
        const incident = await prisma.incident.findUnique({
            where: { id: incidentId },
        });
        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the channel
            const newChannel = await tx.channel.create({
                data: {
                    name,
                    incidentId,
                },
            });
            // 2. Add the member
            await tx.channelMember.create({
                data: {
                    channelId: newChannel.id,
                    userId: userId,
                    role: 'ADMIN', // Try uppercase to be safe
                },
            });
            return newChannel;
        });
        ;
        res.status(201).json({
            success: true,
            channel: diagnostics_channel_1.channel,
            message: 'Channel created successfully',
        });
    }
    catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create channel' });
    }
});
/**
 * GET /api/channels/:channelId
 * Get channel details with members
 */
router.get('/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
                incident: true,
            },
        });
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        res.json(channel);
    }
    catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({ error: 'Failed to fetch channel' });
    }
});
/**
 * GET /api/channels/:channelId/messages
 * Get all messages in a channel with pagination
 * Query: ?page=1&limit=50
 */
router.get('/:channelId/messages', async (req, res) => {
    try {
        const { channelId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
        });
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        const messages = await prisma.message.findMany({
            where: { channelId },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            skip,
            take: limit,
        });
        const total = await prisma.message.count({
            where: { channelId },
        });
        res.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
/**
 * POST /api/channels/:channelId/messages
 * Send a message to a channel
 * Body: { text }
 */
router.post('/:channelId/messages', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { text, userId } = req.body;
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Message text cannot be empty' });
        }
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
        });
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        const membership = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: {
                    channelId,
                    userId,
                },
            },
        });
        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this channel' });
        }
        const message = await prisma.message.create({
            data: {
                text: text.trim(),
                channelId,
                senderId: userId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        res.status(201).json({
            success: true,
            message,
        });
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
/**
 * POST /api/channels/:channelId/members
 * Add a user to a channel
 * Body: { userId }
 */
router.post('/:channelId/members', async (req, res) => {
    try {
        const { channelId } = req.params;
        const { userId } = req.body;
        const requesterId = req.userId;
        const requesterRole = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: {
                    channelId,
                    userId: requesterId,
                },
            },
        });
        if (!requesterRole || requesterRole.role !== 'admin') {
            return res.status(403).json({ error: 'Only channel admins can add members' });
        }
        const existing = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: {
                    channelId,
                    userId,
                },
            },
        });
        if (existing) {
            return res.status(400).json({ error: 'User is already a member' });
        }
        const member = await prisma.channelMember.create({
            data: {
                channelId,
                userId,
                role: 'member',
            },
        });
        res.status(201).json({
            success: true,
            member,
        });
    }
    catch (error) {
        console.error('Error adding channel member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});
exports.default = router;
