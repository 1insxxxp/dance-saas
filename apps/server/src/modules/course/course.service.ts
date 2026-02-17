/**
 * 课程服务：
 * 负责课程创建与分页查询。
 */
import { Injectable } from "@nestjs/common";
import { Course as PrismaCourse } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCourseDto } from "./dto/create-course.dto";

export type Course = PrismaCourse;

export interface CoursePageData {
  items: Course[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, pageSize: number): Promise<CoursePageData> {
    // skip/take 是 Prisma 分页标准实现。
    const skip = (page - 1) * pageSize;

    // 事务中并发查询：列表数据 + 总数。
    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        orderBy: { id: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.course.count(),
    ]);

    return { items, total, page, pageSize };
  }

  async create(dto: CreateCourseDto): Promise<Course> {
    // DTO 中 time 已转换为 Date，这里再次标准化可避免隐式类型差异。
    // 显式标准化 time，避免字符串日期在后续链路出现类型分歧。
    return this.prisma.course.create({
      data: {
        ...dto,
        time: new Date(dto.time),
      },
    });
  }
}
