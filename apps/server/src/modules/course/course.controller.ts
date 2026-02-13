import { Controller, Get } from "@nestjs/common";
import { CourseService, Course } from "./course.service";

@Controller("courses")
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  getCourses(): Course[] {
    return this.courseService.findAll();
  }
}

