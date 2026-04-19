import { Router, Request, Response } from 'express';
import { PrismaClient, $Enums } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/incidents - Create new incident
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            type,
            severity,
            title,
            description,
            zone,
            coordinates,
            reportedById,
            detectionMethod,
            channelId
        } = req.body;

        // Validate required fields
        if (!type || !severity || !title || !description || !zone || !reportedById || !detectionMethod || !channelId) {
            return res.status(400).json({
                error: 'Missing required fields: type, severity, title, description, zone, reportedById, detectionMethod, channelId',
            });
        }

        // Generate unique incidentId
        const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create incident
        const incident = await prisma.incident.create({
            data: {
                incidentId,
                type: type.toUpperCase(),
                severity: severity.toUpperCase(),
                title,
                description,
                zone,
                coordinates: coordinates || null,
                reportedById,
                detectionMethod,
                status: 'ACTIVE',
                channel: {
                    create: {
                        name: "Incident Chat",
                        // incidentId is handled automatically by Prisma here
                    }
                }
            },
            include: {
                reportedBy: true,
                channel: true,
                assignedUnits: true,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Incident created successfully',
            data: incident,
        });
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents - List all incidents
router.get('/', async (req: Request, res: Response) => {
    try {
        const incidents = await prisma.incident.findMany({
            include: {
                reportedBy: true,
                channel: true,
                assignedUnits: true,
                primaryUnit: true,
                timeline: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents,
        });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents/:id - Get single incident by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const incident = await prisma.incident.findUnique({
            where: { id },
            include: {
                reportedBy: true,
                channel: true,
                assignedUnits: true,
                primaryUnit: true,
                timeline: true,
                reports: true,
            },
        });

        if (!incident) {
            return res.status(404).json({
                error: 'Incident not found',
            });
        }

        res.status(200).json({
            success: true,
            data: incident,
        });
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents/status/:status - Get incidents by status
router.get('/status/:status', async (req: Request, res: Response) => {
    try {
        const { status } = req.params;

        const incidents = await prisma.incident.findMany({
            where: {
                status: status.toUpperCase() as $Enums.IncidentStatus,
            },
            include: {
                reportedBy: true,
                channel: true,
                assignedUnits: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents,
        });
    } catch (error) {
        console.error('Error fetching incidents by status:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents/severity/:severity - Get incidents by severity
router.get('/severity/:severity', async (req: Request, res: Response) => {
    try {
        const { severity } = req.params;

        const incidents = await prisma.incident.findMany({
            where: {
                severity: severity.toUpperCase() as $Enums.Severity,
            },
            include: {
                reportedBy: true,
                channel: true,
                assignedUnits: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents,
        });
    } catch (error) {
        console.error('Error fetching incidents by severity:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents - List all incidents
router.get('/', async (req: Request, res: Response) => {
    try {
        const incidents = await prisma.incident.findMany({
            include: {
                patient: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json({
            success: true,
            count: incidents.length,
            data: incidents,
        });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// GET /api/incidents/:id - Get single incident
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const incident = await prisma.incident.findUnique({
            where: { id },
            include: {
                patient: true,
            },
        });

        if (!incident) {
            return res.status(404).json({
                error: 'Incident not found',
            });
        }

        res.status(200).json({
            success: true,
            data: incident,
        });
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
