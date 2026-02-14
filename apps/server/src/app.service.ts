import { Injectable } from "@nestjs/common"; // 导入 Injectable 装饰器

@Injectable() // 标记服务可被注入
export class AppService { // 应用基础服务类
  getHello(): string { // 示例方法
    return "Hello World!"; // 返回问候语
  } // 结束 getHello 方法
} // 结束 AppService 类定义
