"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/units - List all units
router.get('/', async (req, res) => {
    try {
        const units = await prisma.unit.findMany({
            include: {
                members: true,
                assignedIncidents: true,
                primaryIncidents: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.status(200).json({
            success: true,
            count: units.length,
            data: units,
        });
    }
    catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// GET /api/units/:id - Get single unit by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await prisma.unit.findUnique({
            where: { id },
            include: {
                members: true,
                assignedIncidents: true,
                primaryIncidents: true,
            },
        });
        if (!unit) {
            return res.status(404).json({
                error: 'Unit not found',
            });
        }
        res.status(200).json({
            success: true,
            data: unit,
        });
    }
    catch (error) {
        console.error('Error fetching unit:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// GET /api/units/status/available - Get only available units
router.get('/status/available', async (req, res) => {
    try {
        const availableUnits = await prisma.unit.findMany({
            where: {
                status: 'AVAILABLE',
            },
            include: {
                members: true,
                assignedIncidents: true,
            },
        });
        res.status(200).json({
            success: true,
            count: availableUnits.length,
            data: availableUnits,
        });
    }
    catch (error) {
        console.error('Error fetching available units:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// GET /api/units/type/:type - Get units by type
router.get('/type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const units = await prisma.unit.findMany({
            where: {
                type: type.toUpperCase(),
            },
            include: {
                members: true,
                assignedIncidents: true,
            },
        });
        res.status(200).json({
            success: true,
            count: units.length,
            data: units,
        });
    }
    catch (error) {
        console.error('Error fetching units by type:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
