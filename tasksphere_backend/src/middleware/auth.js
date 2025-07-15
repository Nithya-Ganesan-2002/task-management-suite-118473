'use strict';

const { supabase } = require('../supabase');

/**
 * Authentication middleware for Express routes.
 * - Requires a Bearer token in the Authorization header.
 * - Validates and decodes the Supabase JWT using Supabase API.
 * - Attaches the decoded user object (including roles, claims, session validity) to req.user.
 * - Rejects unauthorized, expired, or invalid tokens, and denies non-Supabase-authenticated users.
 * - Optional: Can be extended for role/permission checks if needed in the future.
 * 
 * Usage: add as route middleware.
 */

// PUBLIC_INTERFACE
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !/^Bearer /.test(authHeader)
    ) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
    }
    const token = authHeader.replace(/^Bearer /, '').trim();
    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing.' });
    }

    // Validate using Supabase API (getUser with Bearer JWT)
    // https://supabase.com/docs/reference/javascript/auth-api-getuser
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    // Optionally check for banned/blocked users, email_verified, etc. here

    // Optionally, perform a role check for admin/enduser separation in the future:
    // const userRole = (data.user.role || (data.user.app_metadata && data.user.app_metadata.role)) || '';
    // if (userRole !== "authenticated" && userRole !== "admin") { ... }

    req.user = {
      ...data.user,
      id: data.user.id,
      email: data.user.email,
      // You may want to expose more fields if needed in controllers:
      // role: data.user.role, 
      // app_metadata: data.user.app_metadata
    };

    // Optionally, save token reference for logout/session handling
    req.token = token;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Authentication failed.' });
  }
}

module.exports = { requireAuth };

