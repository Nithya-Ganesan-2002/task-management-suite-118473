const app = require('./app');

// Initialize real-time WebSocket server
const realtime = require('./realtime');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  // Attach WebSocket real-time updates
  realtime.init(server);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Export both HTTP server and real-time emitter for controllers/services
module.exports = server;
