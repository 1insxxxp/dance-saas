import "reflect-metadata"; // 启用反射元数据支持
import "dotenv/config"; // 加载 .env 环境变量
import { NestFactory } from "@nestjs/core"; // 导入 NestFactory
import { AppModule } from "./app.module"; // 导入应用根模块

async function bootstrap() { // 定义应用启动函数
  const app = await NestFactory.create(AppModule); // 创建 Nest 应用实例
  app.setGlobalPrefix("api/v1"); // 设置全局路由前缀
  app.enableCors(); // 启用跨域
  const port = Number(process.env.PORT ?? 3100); // 读取端口，默认 3100
  await app.listen(port); // 启动 HTTP 服务
  console.log(`Nest server is running on http://localhost:${port}`); // 输出启动日志
} // 结束启动函数定义

bootstrap(); // 执行启动函数
