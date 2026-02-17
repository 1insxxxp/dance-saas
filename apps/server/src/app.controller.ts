/**
 * 根控制器：
 * 提供服务可用性检查接口。
 */
import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  // 通过构造注入复用 service 层逻辑，保持控制器仅做路由分发。
  constructor(private readonly appService: AppService) {}

  /**
   * 基础探活接口。
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
