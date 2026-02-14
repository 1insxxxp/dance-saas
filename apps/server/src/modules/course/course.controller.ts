import { Controller, Get } from "@nestjs/common";
import { CourseService, ApiResponse, Course } from "./course.service";

@Controller("courses")
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  getCourses(): ApiResponse<Course[]> {
    return {
      code: 0,
      message: "ok",
      data: this.courseService.findAll(),
    };
  }
}

