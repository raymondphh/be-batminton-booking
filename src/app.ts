import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";

import { env } from "@/config/env";
import { logger } from "@/config/logger";
import routes from "@/routes";
import { notFoundHandler, errorHandler } from "@/middlewares/error.middleware";
import { generalLimiter } from "@/middlewares/rateLimit.middleware";

const app: Application = express();

// An dau vet cong nghe Express (X-Powered-By)
app.disable("x-powered-by");

// Neu chay sau reverse proxy (Nginx, Render, Heroku...) de lay dung IP that cho rate-limit
app.set("trust proxy", 1);

// ==== Bao mat HTTP header ====
app.use(helmet());

app.use(compression());

// ==== CORS - chi cho phep origin cua client, kem cookie ====
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ==== Parse body & cookie ====
app.use(express.json({ limit: "10kb" })); // gioi han kich thuoc body chong DoS
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ==== Chong NoSQL injection (loai bo $ va . trong input) ====
app.use(mongoSanitize());

// ==== Chong HTTP Parameter Pollution ====
app.use(hpp());

// ==== Rate limit tong quat ====
app.use("/api", generalLimiter);

// ==== Logging request ====
app.use(
  morgan(env.isProd ? "combined" : "dev", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }),
);

// ==== Routes ====
app.use("/api", routes);

// ==== 404 & error handler (luon dat cuoi cung) ====
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
