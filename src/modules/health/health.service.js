import { prisma } from '../../config/prisma.js';

export const healthService = {
  async getSystemHealth() {
    await prisma.$queryRaw`SELECT 1`;

    return {
      serverTime: new Date().toISOString(),
      database: 'connected',
      uptimeInSeconds: Math.floor(process.uptime()),
    };
  },
};
