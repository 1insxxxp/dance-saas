/**
 * 课程模块：
 * 装配课程控制器与服务，并引入 Prisma 数据访问能力。
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";

@Module({
  // 课程模块依赖 PrismaModule 提供的数据访问能力。
  imports: [PrismaModule],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
