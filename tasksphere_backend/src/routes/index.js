const express = require('express');
const healthController = require('../controllers/health');
const authController = require('../controllers/auth');
const taskController = require('../controllers/tasks');
const boardController = require('../controllers/boards');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Health endpoint
/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

// Auth endpoints
/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User authentication endpoints
 */

// Signup
router.post('/auth/signup', authController.signup.bind(authController));
// Login
router.post('/auth/login', authController.login.bind(authController));
// Logout
router.post('/auth/logout', authController.logout.bind(authController));

/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: CRUD operations for tasks (require authentication)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: string
 *           example: "8dabb38e-4321-4d7b-aeaa-8ee5f9bb9a5d"
 *         title:
 *           type: string
 *           example: "Example task"
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [todo, in_progress, done]
 *           example: "todo"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * securitySchemes:
 *   bearerAuth:
 *     type: http
 *     scheme: bearer
 *     bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Boards
 *     description: CRUD operations for boards (require authentication). Supports Kanban ordering and board-task management.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Board:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         user_id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         order:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     BoardWithTasks:
 *       allOf:
 *         - $ref: "#/components/schemas/Board"
 *         - type: object
 *           properties:
 *             tasks:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Task"
 */

// Board CRUD routes (require authentication)
router.post('/boards', requireAuth, boardController.create.bind(boardController));
router.get('/boards', requireAuth, boardController.list.bind(boardController));
router.get('/boards/:id', requireAuth, boardController.get.bind(boardController));
router.put('/boards/:id', requireAuth, boardController.update.bind(boardController));
router.delete('/boards/:id', requireAuth, boardController.delete.bind(boardController));
// Kanban: add/move task to board at given order
router.post('/boards/:id/tasks', requireAuth, boardController.addOrMoveTask.bind(boardController));

// Task CRUD routes (all require authentication)
router.post('/tasks', requireAuth, taskController.create.bind(taskController));
router.get('/tasks', requireAuth, taskController.list.bind(taskController));
router.get('/tasks/:id', requireAuth, taskController.get.bind(taskController));
router.put('/tasks/:id', requireAuth, taskController.update.bind(taskController));
router.delete('/tasks/:id', requireAuth, taskController.delete.bind(taskController));

module.exports = router;
