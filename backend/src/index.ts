import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';


// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 3000;

// Initialize Prisma Client
const prisma = new PrismaClient();

//HTTP Server and Socket.io instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ["GET", "POST"],
        credentials: true,
    }
});

// ============ MIDDLEWARE ============

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

// ============ SOCKET.IO HANDLERS ============
io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    const userId = socket.handshake.auth.userId;
    const userRole = socket.handshake.auth.userRole;
    const zone = socket.handshake.auth.zone;

    if (!userId) {
        socket.disconnect();
        return;
    }

    /**
     * EVENT 1: User connection - Join appropriate rooms
     */
    socket.on('user:connect', (data: { userId: string; role: string; zone: string }) => {
        try {
            socket.join(`zone-${data.zone}`);
            socket.join(`user-${data.userId}`);

            if (data.role === 'responder') {
                socket.join('responders');
            }

            io.emit('user:status', {
                userId: data.userId,
                status: 'online',
                zone: data.zone,
                timestamp: new Date(),
            });

            console.log(`User ${data.userId} connected to zone-${data.zone}`);
        } catch (error) {
            console.error('Error in user:connect:', error);
            socket.emit('error', { message: 'Failed to connect user' });
        }
    });

    /**
     * EVENT 2: New incident created - Dispatch to zone responders
     */
    socket.on('incident:created', async (data: any) => {
        try {
            const { id, zone, priority, title, location } = data;

            io.to(`zone-${zone}`).emit('incident:dispatch', {
                incidentId: id,
                zone,
                priority,
                title,
                location,
                timestamp: new Date(),
                action: 'NEW_INCIDENT',
            });

            console.log(`Incident ${id} dispatched to zone-${zone}`);
        } catch (error) {
            console.error('Error dispatching incident:', error);
            socket.emit('error', { message: 'Failed to dispatch incident' });
        }
    });

    /**
     * EVENT 3: Responder acknowledges dispatch
     */
    socket.on('dispatch:acknowledge', async (data: { incidentId: string; unitId: string; eta: number }) => {
        try {
            const { incidentId, unitId, eta } = data;

            io.to('zone-coordinators').emit('dispatch:acknowledged', {
                incidentId,
                unitId,
                eta,
                timestamp: new Date(),
            });

            console.log(`Unit ${unitId} acknowledged incident ${incidentId}`);
        } catch (error) {
            console.error('Error acknowledging dispatch:', error);
            socket.emit('error', { message: 'Failed to acknowledge dispatch' });
        }
    });

    /**
     * EVENT 4: Send message to channel (with database persistence)
     */
    socket.on('message:send', async (data: { channelId: string; text: string }) => {
        try {
            const { channelId, text } = data;

            if (!text || text.trim().length === 0) {
                socket.emit('error', { message: 'Message cannot be empty' });
                return;
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

            io.to(`channel-${channelId}`).emit('message:received', {
                messageId: message.id,
                channelId,
                text: message.text,
                sender: message.sender,
                timestamp: message.createdAt,
            });

            console.log(`Message sent to channel ${channelId} by ${userId}`);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    /**
     * EVENT 5: Unit status change
     */
    socket.on('unit:status-change', async (data: { unitId: string; status: string; location?: { lat: number; lng: number } }) => {
        try {
            const { unitId, status, location } = data;

            io.to('zone-coordinators').emit('unit:status-updated', {
                unitId,
                status,
                location,
                timestamp: new Date(),
            });

            io.to(`incident-${unitId}`).emit('unit:location-update', {
                unitId,
                location,
                timestamp: new Date(),
            });

            console.log(`Unit ${unitId} status changed to ${status}`);
        } catch (error) {
            console.error('Error updating unit status:', error);
            socket.emit('error', { message: 'Failed to update unit status' });
        }
    });

    /**
     * EVENT 6: Join channel room
     */
    socket.on('channel:join', (data: { channelId: string }) => {
        try {
            const { channelId } = data;
            socket.join(`channel-${channelId}`);

            io.to(`channel-${channelId}`).emit('user:joined-channel', {
                userId,
                channelId,
                timestamp: new Date(),
            });

            console.log(`User ${userId} joined channel ${channelId}`);
        } catch (error) {
            console.error('Error joining channel:', error);
            socket.emit('error', { message: 'Failed to join channel' });
        }
    });

    /**
     * EVENT 7: Leave channel room
     */
    socket.on('channel:leave', (data: { channelId: string }) => {
        try {
            const { channelId } = data;
            socket.leave(`channel-${channelId}`);

            io.to(`channel-${channelId}`).emit('user:left-channel', {
                userId,
                channelId,
                timestamp: new Date(),
            });

            console.log(`User ${userId} left channel ${channelId}`);
        } catch (error) {
            console.error('Error leaving channel:', error);
        }
    });

    /**
     * EVENT 8: Disconnect
     */
    socket.on('disconnect', () => {
        try {
            io.emit('user:status', {
                userId,
                status: 'offline',
                timestamp: new Date(),
            });

            console.log('User disconnected:', socket.id);
        } catch (error) {
            console.error('Error on disconnect:', error);
        }
    });

    socket.on('error', (error: any) => {
        console.error('Socket error:', error);
    });
});
// ============ ROUTES ============

// Import route files
import incidentsRouter from './routes/incidents';
import unitsRouter from './routes/units';
import channelsRoutes from './routes/channels';
// 1. Import it (Make sure auth.ts exists in routes/)
import authRouter from './routes/auth';
import { mlClient } from './services/mlClient';

/**
 * Health check for ML service
 */
app.get('/api/health/ml', async (req: Request, res: Response) => {
    try {
        const isHealthy = await mlClient.healthCheck();

        if (isHealthy) {
            res.json({ status: 'healthy', service: 'ml-service' });
        } else {
            res.status(503).json({ status: 'unhealthy', service: 'ml-service' });
        }
    } catch (error) {
        res.status(503).json({ status: 'error', service: 'ml-service', error: String(error) });
    }
});

// 2. Mount it
app.use('/api/auth', authRouter); // This makes /api/auth/login possible


// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Backend is running',
        timestamp: new Date(),
    });
});

// API Routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/units', unitsRouter);
app.use('/api/channels', channelsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method,
    });
});



// ============ ERROR HANDLING ============

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Global error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// ============ SERVER STARTUP ============

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');

        // Start server
        httpServer.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
            console.log(`📊 Health check: http://localhost:${port}/health`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
export { io, prisma };
// ============ GRACEFUL SHUTDOWN ============

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
