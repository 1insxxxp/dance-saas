/**
 * Prisma 服务：
 * 负责创建 PrismaClient（MariaDB 适配器）并在模块生命周期中维护连接。
 */
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { URL } from "node:url";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 启动阶段强校验数据库连接串，避免服务启动后才暴露配置错误。
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(databaseUrl);
    } catch {
      throw new Error("DATABASE_URL is invalid");
    }

    // 从 DATABASE_URL 解析连接参数，组装 MariaDB adapter。
    const charset = process.env.DATABASE_CHARSET ?? "utf8mb4";
    const collation = process.env.DATABASE_COLLATION ?? "utf8mb4_unicode_ci";

    const adapter = new PrismaMariaDb({
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : 3306,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: parsedUrl.pathname.replace(/^\//, ""),
      // 显式指定连接字符集与排序规则，避免不同客户端默认值不一致。
      charset,
      collation,
      connectTimeout: PrismaService.parseTimeout(
        process.env.DATABASE_CONNECT_TIMEOUT_MS,
        10000,
      ),
      acquireTimeout: PrismaService.parseTimeout(
        process.env.DATABASE_ACQUIRE_TIMEOUT_MS,
        30000,
      ),
    });

    super({ adapter });
  }

  // 模块初始化时主动建立连接，尽早发现数据库不可用问题。
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // 进程退出或模块销毁时释放连接，避免连接泄漏。
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * 解析超时配置；非法值回退到默认值。
   */
  private static parseTimeout(
    raw: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
