'use strict';

const WebSocket = require('ws');

/**
 * RealTimeServer provides WebSocket-based real-time update broadcasting for TaskSphere API.
 * It supports subscriptions for authenticated users, broadcasting updates for:
 *   - Task CRUD (created/updated/deleted)
 *   - Board CRUD
 *   - Board-task moves (Kanban drag-and-drop)
 *
 * Usage:
 *   const realtime = require('./realtime');
 *   realtime.init(server); // attach to Express http.Server
 *   realtime.emitUpdate({ type: 'task_updated', payload: { ... } });
 */

// In-memory user <-> ws mapping
const clients = new Set();

/**
 * PUBLIC_INTERFACE
 * Initializes the WebSocket server and attaches to the given HTTP server.
 * @param {http.Server} server - Node.js HTTP/S server instance (from Express)
 */
function init(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.user_id = null;

    ws.on('pong', () => (ws.isAlive = true));

    // Expect initial authentication message: {type:'auth', token:'...'}
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'auth' && typeof data.token === 'string') {
          // For backend, trust JWT as user_id (should be validated on server)
          // For production, verify JWT!
          ws.user_id = data.user_id || null;
        }
        // No further message types supported server-to-server here
      } catch (e) {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    clients.add(ws);
  });

  // Heartbeat for dead connection cleanup
  setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        clients.delete(ws);
      } else {
        ws.isAlive = false;
        ws.ping();
      }
    });
  }, 30000);

  // Attach broadcast/emitUpdate to exports
  module.exports.broadcastUpdate = function broadcastUpdate(event) {
    const payload = JSON.stringify(event);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  };
}

// PUBLIC_INTERFACE
/**
 * Emit a real-time event to all connected clients.
 * @param {object} event - { type: string, payload: object }
 */
function emitUpdate(event) {
  if (typeof module.exports.broadcastUpdate === 'function') {
    module.exports.broadcastUpdate(event);
  }
}

module.exports = { init, emitUpdate };
