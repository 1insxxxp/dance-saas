import { Module } from "@nestjs/common"; // 导入 Module 装饰器
import { PrismaModule } from "../../prisma/prisma.module"; // 导入 Prisma 模块依赖
import { CourseController } from "./course.controller"; // 导入课程控制器
import { CourseService } from "./course.service"; // 导入课程服务

@Module({ // 定义模块元数据
  imports: [PrismaModule], // 注册依赖模块
  controllers: [CourseController], // 注册控制器
  providers: [CourseService], // 注册服务提供者
}) // 结束模块元数据定义
export class CourseModule {} // 导出课程模块
