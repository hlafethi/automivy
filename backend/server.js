const app = require('./app');
const config = require('./config');

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${config.server.corsOrigin}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
