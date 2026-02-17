/**
 * Prisma 模块：
 * 统一导出 PrismaService，供业务模块注入使用。
 */
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Module({
  // PrismaService 作为单例提供，避免每个模块重复创建数据库连接。
  providers: [PrismaService],
  // 导出后其余业务模块可直接注入 PrismaService。
  exports: [PrismaService],
})
export class PrismaModule {}
