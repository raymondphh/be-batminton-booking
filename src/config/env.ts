import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Validate toan bo bien moi truong ngay khi app khoi dong.
 * Neu thieu/sai -> throw loi va dung server ngay lap tuc,
 * tranh chay production voi cau hinh sai (vi du thieu JWT secret).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  CLIENT_URL: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI la bat buoc'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET phai co it nhat 32 ky tu'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET phai co it nhat 32 ky tu'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_SALT_ROUNDS: z.string().default('12'),

  MAX_LOGIN_ATTEMPTS: z.string().default('5'),
  LOCK_TIME_MINUTES: z.string().default('15'),

  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
  DEFAULT_ADMIN_FULLNAME: z.string().optional(),

  COOKIE_DOMAIN: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Bien moi truong khong hop le:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  isProd: data.NODE_ENV === 'production',
  port: parseInt(data.PORT, 10),
  clientUrl: data.CLIENT_URL,

  mongodbUri: data.MONGODB_URI,

  jwtAccessSecret: data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: data.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: data.JWT_REFRESH_EXPIRES_IN,

  bcryptSaltRounds: parseInt(data.BCRYPT_SALT_ROUNDS, 10),

  maxLoginAttempts: parseInt(data.MAX_LOGIN_ATTEMPTS, 10),
  lockTimeMinutes: parseInt(data.LOCK_TIME_MINUTES, 10),

  defaultAdminEmail: data.DEFAULT_ADMIN_EMAIL,
  defaultAdminPassword: data.DEFAULT_ADMIN_PASSWORD,
  defaultAdminFullname: data.DEFAULT_ADMIN_FULLNAME,

  cookieDomain: data.COOKIE_DOMAIN
};
