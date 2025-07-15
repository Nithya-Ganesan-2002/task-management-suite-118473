const express = require('express');
const healthController = require('../controllers/health');
const authController = require('../controllers/auth');

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

module.exports = router;
