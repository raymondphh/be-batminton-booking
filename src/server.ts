import app from './app';
import { env } from '@/config/env';
import { connectDB } from '@/config/database';
import { logger } from '@/config/logger';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server dang chay tai http://localhost:${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} nhan duoc, dang tat server...`);
    server.close(() => {
      logger.info('Server da dong.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
};

startServer();
