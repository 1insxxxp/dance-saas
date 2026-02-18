/**
 * Prisma 配置文件：
 * 1) 显式加载 apps/server/.env
 * 2) 指定 schema、migrations 与 seed 命令
 * 3) 注入 DATABASE_URL
 */
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
