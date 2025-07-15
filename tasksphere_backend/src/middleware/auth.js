'use strict';

const { supabase } = require('../supabase');

/**
 * Authentication middleware for Express routes.
 * 
 * - Requires a Bearer token in the Authorization header.
 * - Validates and decodes the Supabase JWT using Supabase API.
 * - Attaches the decoded user object to request as req.user.
 * - Rejects unauthorized or invalid tokens.
 * 
 * Usage: add as route middleware.
 */

// PUBLIC_INTERFACE
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header.' });
    }
    const token = authHeader.replace('Bearer ', '');
    // Use Supabase API to verify token: getSession(token) or getUser(token)
    // @supabase/supabase-js v2: use getUser(token)
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    req.user = {
      ...data.user,
      id: data.user.id,
      email: data.user.email,
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Authentication failed.' });
  }
}

module.exports = { requireAuth };
