/**
 * 应用启动入口：
 * 负责初始化 Nest 应用、全局校验、全局响应包装、全局异常处理与服务监听。
 */
import "reflect-metadata";
import "dotenv/config";
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./filters/http-exception.filter";

interface ValidationIssue {
  field: string;
  errors: string[];
}

/**
 * 将 class-validator 的树形错误结构扁平化，便于前端直接按字段展示。
 */
function collectValidationIssues(
  errors: ValidationError[],
  parentPath = "",
): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const issues =
      error.constraints && Object.keys(error.constraints).length > 0
        ? [{ field, errors: Object.values(error.constraints) }]
        : [];

    // 递归收集嵌套对象的校验错误
    const childIssues = error.children?.length
      ? collectValidationIssues(error.children, field)
      : [];

    return [...issues, ...childIssues];
  });
}

async function bootstrap() {
  // 创建 Nest 应用实例，并装配 AppModule 中声明的所有模块。
  const app = await NestFactory.create(AppModule);

  // 全局参数校验：自动转换类型、清理白名单外字段，并输出统一错误结构。
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[] = []) =>
        new BadRequestException({
          code: 400,
          message: "validation error",
          data: collectValidationIssues(errors),
        }),
    }),
  );

  // 成功响应统一为 { code, message, data }。
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 异常响应统一为 { code, message, data }。
  app.useGlobalFilters(new HttpExceptionFilter());

  // 统一添加业务前缀，避免各模块手动拼接版本路径。
  app.setGlobalPrefix("api/v1");
  // 开发期允许前端本地联调；生产环境可按域名白名单收敛。
  app.enableCors();

  // 端口优先读取环境变量，未配置时回退到 3100。
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  // 启动日志仅用于开发定位，线上建议接入标准日志系统。
  console.log(`Nest server is running on http://localhost:${port}`);
}

bootstrap();
