import { Module } from '@nestjs/common'; // 导入 Module 装饰器

import { PrismaService } from './prisma.service'; // 导入 Prisma 服务

@Module({ // 定义 Prisma 模块元数据
  providers: [PrismaService], // 注册 PrismaService 提供者
  exports: [PrismaService], // 向外导出 PrismaService
}) // 结束模块元数据定义
export class PrismaModule {} // 导出 Prisma 模块
