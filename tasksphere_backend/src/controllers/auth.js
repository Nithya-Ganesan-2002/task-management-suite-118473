'use strict';

const { supabase } = require('../supabase');

/**
 * User Authentication Controller
 *
 * Handles user signup, login, and logout via Supabase Auth.
 * Each method validates input, interacts with Supabase, and returns appropriate responses.
 */
class AuthController {
  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /auth/signup:
   *   post:
   *     summary: Create a new user account
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: ExamplePass123
   *     responses:
   *       201:
   *         description: Account created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                 session:
   *                   type: object
   *                 access_token:
   *                   type: string
   *       400:
   *         description: Input validation error or user already exists
   *       500:
   *         description: Supabase error or backend error
   */
  async signup(req, res) {
    try {
      const { email, password } = req.body;
      if (
        !email ||
        !password ||
        typeof email !== 'string' ||
        typeof password !== 'string'
      ) {
        return res
          .status(400)
          .json({ status: 'error', message: 'Email and password are required.' });
      }
      // Supabase sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      // Optionally: set tokens in cookie
      // Return session and user data
      return res.status(201).json({
        user: data.user,
        session: data.session,
        access_token: data.session?.access_token || null,
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to sign up', details: err.message });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Authenticate a user and create a session
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: ExamplePass123
   *     responses:
   *       200:
   *         description: Authenticated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                 session:
   *                   type: object
   *                 access_token:
   *                   type: string
   *       400:
   *         description: Input validation error or invalid credentials
   *       500:
   *         description: Supabase error or backend error
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (
        !email ||
        !password ||
        typeof email !== 'string' ||
        typeof password !== 'string'
      ) {
        return res
          .status(400)
          .json({ status: 'error', message: 'Email and password are required.' });
      }
      // Supabase sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      // Optionally: set tokens in cookie
      // Return session and user data
      return res.status(200).json({
        user: data.user,
        session: data.session,
        access_token: data.session?.access_token || null,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to login', details: err.message });
    }
  }

  // PUBLIC_INTERFACE
  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Log out the current user (invalidates Supabase session)
   *     tags:
   *       - Auth
   *     requestBody:
   *       required: false
   *     responses:
   *       200:
   *         description: Session revoked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *       401:
   *         description: No valid token or already logged out
   *       500:
   *         description: Unexpected server error
   */
  async logout(req, res) {
    // For logout, client should pass access_token in Authorization header
    try {
      // Parse access_token from header
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'error',
          message: 'Missing or invalid Authorization header.',
        });
      }
      const access_token = authHeader.replace('Bearer ', '');
      // Invalidate session in Supabase (with signOut)
      const { error } = await supabase.auth.signOut(access_token);
      if (error) {
        return res.status(400).json({ status: 'error', message: error.message });
      }
      return res.status(200).json({
        message: 'Logged out successfully.',
      });
    } catch (err) {
      console.error('Logout error:', err);
      return res
        .status(500)
        .json({ status: 'error', message: 'Failed to logout', details: err.message });
    }
  }
}

module.exports = new AuthController();
