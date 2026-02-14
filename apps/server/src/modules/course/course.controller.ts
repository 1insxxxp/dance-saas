import { Controller, Get } from "@nestjs/common"; // 导入 Controller 和 Get 装饰器
import { CourseService, ApiResponse, Course } from "./course.service"; // 导入课程服务和响应类型

@Controller("courses") // 设置控制器路由前缀
export class CourseController { // 课程控制器类
  constructor(private readonly courseService: CourseService) {} // 通过构造函数注入课程服务

  @Get() // 处理 GET /courses 请求
  async getCourses(): Promise<ApiResponse<Course[]>> { // 定义获取课程列表接口
    return this.courseService.findAll(); // 直接返回 service 的统一包装结果
  } // 结束 getCourses 方法
} // 结束 CourseController 类定义
