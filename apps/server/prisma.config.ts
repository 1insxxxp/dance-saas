import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// 强制加载 apps/server/.env
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
