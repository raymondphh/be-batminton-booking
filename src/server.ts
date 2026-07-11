import http from "http";
import app from "./app";
import { env } from "@/config/env";
import { connectDB } from "@/config/database";
import { logger } from "@/config/logger";
import { initSocket } from "@/config/socket";

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    logger.info(
      `🚀 Server dang chay tai http://localhost:${env.port} [${env.nodeEnv}]`,
    );
    logger.info(`🔌 Socket.IO da san sang nhan ket noi real-time`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} nhan duoc, dang tat server...`);
    httpServer.close(() => {
      logger.info("Server da dong.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    httpServer.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
};

startServer();
