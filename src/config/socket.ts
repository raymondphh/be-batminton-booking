import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyAccessToken } from "@/utils/jwt";
import { env } from "./env";
import { logger } from "./logger";
import { UserRole } from "@/models/User";

interface AuthedSocket extends Socket {
  userId?: string;
  userRole?: UserRole;
}

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Thieu access token"));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error("Access token khong hop le hoac da het han"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    logger.info(
      `🔌 Socket ket noi: user=${socket.userId} role=${socket.userRole}`,
    );

    if (
      socket.userRole === UserRole.ADMIN ||
      socket.userRole === UserRole.MANAGER
    ) {
      socket.join("staff");
    }
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on("slots:join", (payload: { courtId?: string; date?: string }) => {
      const { courtId, date } = payload || {};
      if (!courtId || !date) return;
      socket.join(`slots:${courtId}:${date}`);
    });

    socket.on("slots:leave", (payload: { courtId?: string; date?: string }) => {
      const { courtId, date } = payload || {};
      if (!courtId || !date) return;
      socket.leave(`slots:${courtId}:${date}`);
    });

    socket.on("disconnect", () => {
      logger.info(`🔌 Socket ngat ket noi: user=${socket.userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io)
    throw new Error("Socket.IO chua duoc khoi tao. Goi initSocket() truoc.");
  return io;
};
