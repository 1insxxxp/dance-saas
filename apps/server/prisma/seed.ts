/**
 * Seed 脚本：
 * 初始化后台管理员账号，并保证重复执行时结果一致。
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { URL } from "node:url";

const BCRYPT_SALT_ROUNDS = 10;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const parsedUrl = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: parsedUrl.hostname,
  port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
  charset: process.env.DATABASE_CHARSET ?? "utf8mb4",
  collation: process.env.DATABASE_COLLATION ?? "utf8mb4_unicode_ci",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const [adminPasswordHash, testPasswordHash] = await Promise.all([
    bcrypt.hash("123456", BCRYPT_SALT_ROUNDS),
    bcrypt.hash("123456", BCRYPT_SALT_ROUNDS),
  ]);

  // 默认超级管理员：admin / 123456（数据库存储为 bcrypt 哈希）。
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {
      password: adminPasswordHash,
      refreshTokenHash: null,
      role: Role.SUPER,
    },
    create: {
      username: "admin",
      password: adminPasswordHash,
      refreshTokenHash: null,
      role: Role.SUPER,
    },
  });

  // 测试账号：test / 123456（数据库存储为 bcrypt 哈希）。
  await prisma.admin.upsert({
    where: { username: "test" },
    update: {
      password: testPasswordHash,
      refreshTokenHash: null,
      role: Role.NORMAL,
    },
    create: {
      username: "test",
      password: testPasswordHash,
      refreshTokenHash: null,
      role: Role.NORMAL,
    },
  });

  console.log("[seed] Accounts ready: admin(SUPER), test(NORMAL)");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
