import { Controller, Get } from "@nestjs/common"; // 导入 Controller 和 Get 装饰器
import { AppService } from "./app.service"; // 导入应用服务

@Controller() // 定义控制器
export class AppController { // 应用控制器类
  constructor(private readonly appService: AppService) {} // 注入应用服务

  @Get() // 处理根路径 GET 请求
  getHello(): string { // 返回欢迎语接口
    return this.appService.getHello(); // 调用 service 返回文本
  } // 结束 getHello 方法
} // 结束 AppController 类定义
