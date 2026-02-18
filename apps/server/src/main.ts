/**
 * 应用启动入口：
 * 负责初始化 Nest 应用、全局参数校验、统一响应包装、全局异常处理与全局鉴权。
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
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";

interface ValidationIssue {
  field: string;
  errors: string[];
}

/**
 * 将 class-validator 的树形错误结构扁平化，方便前端按字段展示。
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

    const childIssues = error.children?.length
      ? collectValidationIssues(error.children, field)
      : [];

    return [...issues, ...childIssues];
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // JWT + 角色守卫全局生效；无需鉴权的接口通过 @Public 显式放行。
  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));

  app.setGlobalPrefix("api/v1");
  app.enableCors();

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  console.log(`Nest server is running on http://localhost:${port}`);
}

bootstrap();
