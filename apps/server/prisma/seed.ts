/**
 * Seed 脚本：
 * 初始化默认管理员（仅当 Admin 表为空时创建）。
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { URL } from "node:url";

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
  const adminCount = await prisma.admin.count();

  if (adminCount > 0) {
    console.log("[seed] Admin already exists, skip.");
    return;
  }

  await prisma.admin.create({
    data: {
      username: "admin",
      password: "123456",
    },
  });

  console.log("[seed] Default admin created: admin / 123456");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
