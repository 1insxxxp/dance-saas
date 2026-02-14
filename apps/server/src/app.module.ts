import { Module } from "@nestjs/common"; // 导入 Module 装饰器
import { AppController } from "./app.controller"; // 导入应用控制器
import { AppService } from "./app.service"; // 导入应用服务
import { CourseModule } from "./modules/course/course.module"; // 导入课程模块

@Module({ // 定义应用根模块元数据
  imports: [CourseModule], // 注册依赖模块
  controllers: [AppController], // 注册控制器
  providers: [AppService], // 注册服务提供者
}) // 结束模块元数据定义
export class AppModule {} // 导出应用根模块
