/**
 * 课程控制器：
 * 提供课程创建与分页查询接口。
 */
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Course, CoursePageData, CourseService } from "./course.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { ListCourseDto } from "./dto/list-course.dto";

@Controller("courses")
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // 课程分页列表：默认第一页，每页 10 条。
  @Get()
  async getCourses(@Query() query: ListCourseDto): Promise<CoursePageData> {
    // 分页参数默认值
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.courseService.findAll(page, pageSize);
  }

  // 创建课程：由 DTO 完成字段合法性校验。
  @Post()
  async createCourse(@Body() dto: CreateCourseDto): Promise<Course> {
    return this.courseService.create(dto);
  }
}
