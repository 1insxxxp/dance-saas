import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'; // 导入生命周期接口与 Injectable 装饰器
import { PrismaMariaDb } from '@prisma/adapter-mariadb'; // 导入 MariaDB 驱动适配器
import { PrismaClient } from '@prisma/client'; // 导入 Prisma 客户端

@Injectable() // 标记为可注入服务
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // 构造 Prisma 客户端并注入数据库适配器
  constructor() {
    // 读取数据库连接字符串
    const databaseUrl = process.env.DATABASE_URL;

    // 未配置连接字符串时直接抛错
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    // 声明 URL 解析结果变量
    let parsedUrl: URL;

    // 解析 DATABASE_URL
    try {
      parsedUrl = new URL(databaseUrl);
    // URL 非法时抛出明确错误
    } catch {
      throw new Error('DATABASE_URL is invalid');
    }

    // 创建 MariaDB 适配器并配置连接参数
    const adapter = new PrismaMariaDb({
      host: parsedUrl.hostname, // 数据库主机地址
      port: parsedUrl.port ? Number(parsedUrl.port) : 3306, // 数据库端口，默认 3306
      user: decodeURIComponent(parsedUrl.username), // 数据库用户名
      password: decodeURIComponent(parsedUrl.password), // 数据库密码
      database: parsedUrl.pathname.replace(/^\//, ''), // 数据库名
      connectTimeout: PrismaService.parseTimeout(
        process.env.DATABASE_CONNECT_TIMEOUT_MS,
        10000,
      ), // 建连超时配置
      acquireTimeout: PrismaService.parseTimeout(
        process.env.DATABASE_ACQUIRE_TIMEOUT_MS,
        30000,
      ), // 连接池获取超时配置
    });

    // 将 adapter 传给 PrismaClient 父类构造函数
    super({ adapter });
  }

  // 模块初始化时建立数据库连接
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // 模块销毁时断开数据库连接
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // 解析超时配置，非法值时回退默认值
  private static parseTimeout(
    raw: string | undefined,
    fallback: number,
  ): number {
    // 尝试转换为数字
    const parsed = Number(raw);
    // 返回有效正数，否则回退默认值
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
