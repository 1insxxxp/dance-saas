/**
 * Prisma 配置文件：
 * 1) 显式加载 apps/server/.env；
 * 2) 指定 schema 与 migration 目录；
 * 3) 将 DATABASE_URL 注入 Prisma CLI。
 */
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// 让 prisma generate / prisma migrate 在任意目录执行时都能拿到同一份环境变量。
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  // schema 主文件路径（相对 apps/server）。
  schema: "prisma/schema.prisma",
  migrations: {
    // 迁移目录，prisma migrate dev 会在这里生成版本化 SQL。
    path: "prisma/migrations",
  },
  datasource: {
    // 连接串由 .env 注入；为空时会在 Prisma 执行阶段报错。
    url: process.env.DATABASE_URL,
  },
});
