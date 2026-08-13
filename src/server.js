import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

let server;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] ${signal} received; shutting down.`);

  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect().catch(() => {});
  clearTimeout(forceExit);
  process.exit(exitCode);
};

const start = async () => {
  await prisma.$queryRaw`SELECT 1`;
  server = app.listen(env.port, () => {
    console.log(`${env.appName} is running on port ${env.port}`);
  });

  server.on('error', (error) => {
    console.error('[server] Listener failed:', error);
    shutdown('listener-error', 1);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error);
  shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (error) => {
  console.error('[server] Unhandled rejection:', error);
  shutdown('unhandledRejection', 1);
});

start().catch((error) => {
  console.error('[server] Startup failed:', error);
  shutdown('startup-error', 1);
});
