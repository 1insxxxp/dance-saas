import { Injectable } from "@nestjs/common"; // 导入 Injectable 装饰器
import { Course as PrismaCourse } from "@prisma/client"; // 导入 Prisma 的 Course 类型

import { PrismaService } from "../../prisma/prisma.service"; // 导入 Prisma 服务
import { CreateCourseDto } from "./dto/create-course-dto"; // 导入创建课程 DTO

export type Course = PrismaCourse; // 统一 Course 类型别名

@Injectable() // 标记为可注入服务
export class CourseService {
  constructor(private readonly prisma: PrismaService) {} // 注入 PrismaService

  // 只做数据库查询，返回纯课程数据
  async findAll(): Promise<Course[]> {
    return this.prisma.course.findMany({
      orderBy: { id: "desc" },
    });
  }

  // 只做数据库写入，返回创建后的纯课程数据
  async create(dto: CreateCourseDto): Promise<Course> {
    const data = {
      ...dto,
      time: new Date(dto.time), // body 的 time 是字符串，这里转换成 Date
    };

    return this.prisma.course.create({ data });
  }
}
