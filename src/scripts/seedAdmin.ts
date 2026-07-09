/* eslint-disable no-console */
import { connectDB, disconnectDB } from '@/config/database';
import { User, UserRole } from '@/models/User';
import { env } from '@/config/env';

/**
 * Chay 1 lan de tao tai khoan ADMIN dau tien cua he thong:
 *   npm run seed:admin
 * Sau khi co admin, admin se dang nhap va tu tao cac tai khoan quan ly (manager) khac
 * qua API POST /api/admin/managers.
 */
const seedAdmin = async () => {
  if (!env.defaultAdminEmail || !env.defaultAdminPassword) {
    console.error('❌ Thieu DEFAULT_ADMIN_EMAIL hoac DEFAULT_ADMIN_PASSWORD trong file .env');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: env.defaultAdminEmail });
  if (existing) {
    console.log(`⚠️  Tai khoan admin voi email ${env.defaultAdminEmail} da ton tai. Bo qua.`);
    await disconnectDB();
    process.exit(0);
  }

  const admin = await User.create({
    fullName: env.defaultAdminFullname || 'Super Admin',
    email: env.defaultAdminEmail,
    password: env.defaultAdminPassword,
    role: UserRole.ADMIN
  });

  console.log('✅ Da tao tai khoan admin dau tien thanh cong:');
  console.log(`   Email: ${admin.email}`);
  console.log('   (Hay dang nhap va doi mat khau ngay neu day la moi truong production)');

  await disconnectDB();
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('❌ Loi khi seed admin:', err);
  process.exit(1);
});
