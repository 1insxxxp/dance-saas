import { Body, Controller, Get, Post } from "@nestjs/common"; // 导入路由与参数装饰器

import { CreateCourseDto } from "./dto/create-course-dto"; // 导入创建课程 DTO
import { Course, CourseService } from "./course.service"; // 导入课程服务与类型

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Controller("courses") // 路由前缀：/courses
export class CourseController {
  constructor(private readonly courseService: CourseService) {} // 注入课程服务

  @Get() // GET /api/v1/courses
  async getCourses(): Promise<ApiResponse<Course[] | null>> {
    try {
      const result = await this.courseService.findAll();
      return {
        code: 0,
        message: "ok",
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: error instanceof Error ? error.message : "internal server error",
        data: null,
      };
    }
  }

  @Post() // POST /api/v1/courses
  async createCourse(
    @Body() body: CreateCourseDto,
  ): Promise<ApiResponse<Course | null>> {
    try {
      const result = await this.courseService.create(body);
      return {
        code: 0,
        message: "ok",
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: error instanceof Error ? error.message : "internal server error",
        data: null,
      };
    }
  }
}
