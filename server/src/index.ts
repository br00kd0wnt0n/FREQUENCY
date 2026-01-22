import { createServer } from 'http';
import dotenv from 'dotenv';
import app from './app';
import { setupSocket } from './socket';
import { testConnection } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3001;

async function start() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.io
  const io = setupSocket(httpServer);

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗██████╗ ███████╗ ██████╗ ██╗   ██╗███████╗███╗   ██╗ ██████╗██╗   ██╗  ║
║   ██╔════╝██╔══██╗██╔════╝██╔═══██╗██║   ██║██╔════╝████╗  ██║██╔════╝╚██╗ ██╔╝  ║
║   █████╗  ██████╔╝█████╗  ██║   ██║██║   ██║█████╗  ██╔██╗ ██║██║      ╚████╔╝   ║
║   ██╔══╝  ██╔══██╗██╔══╝  ██║▄▄ ██║██║   ██║██╔══╝  ██║╚██╗██║██║       ╚██╔╝    ║
║   ██║     ██║  ██║███████╗╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╗   ██║     ║
║   ╚═╝     ╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝     ║
║                                                           ║
║   Server running on port ${PORT}                            ║
║   WebSocket ready for connections                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);
