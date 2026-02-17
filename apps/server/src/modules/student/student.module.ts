/**
 * 学员模块：
 * 装配学员控制器与服务，并引入 PrismaModule。
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";

@Module({
  // 学员模块通过 PrismaModule 访问 student 表。
  imports: [PrismaModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
