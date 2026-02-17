/**
 * 根服务：
 * 存放与业务无关的基础示例逻辑。
 */
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  /**
   * 返回默认欢迎文本。
   * 该方法保留为最小示例，也可替换为版本号、健康状态等信息。
   */
  getHello(): string {
    return "Hello World!";
  }
}
