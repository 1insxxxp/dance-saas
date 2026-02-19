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
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { CsrfGuard } from "./modules/auth/guards/csrf.guard";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";

interface ValidationIssue {
  field: string;
  errors: string[];
}

type CorsCallback = (error: Error | null, allow?: boolean) => void;

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

/**
 * 解析 CORS_ORIGIN，支持逗号分隔多个域名。
 */
function parseCorsOrigins(rawValue: string | undefined): string[] {
  return String(rawValue ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOriginWhitelist = parseCorsOrigins(process.env.CORS_ORIGIN);

  // 解析 Cookie，供 /auth/refresh 从 req.cookies 读取 refreshToken。
  app.use(cookieParser());

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

  // JWT + CSRF + 角色守卫全局生效；登录/刷新由 CsrfGuard 内部排除。
  app.useGlobalGuards(
    app.get(JwtAuthGuard),
    app.get(CsrfGuard),
    app.get(RolesGuard),
  );

  app.setGlobalPrefix("api/v1");
  // CORS 使用白名单 + credentials，满足 cookie 鉴权跨域请求。
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, callback: CorsCallback) => {
      // 非浏览器请求（如 curl / server-to-server）放行。
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsOriginWhitelist.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
  });

  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port);
  console.log(`Nest server is running on http://localhost:${port}`);
}

bootstrap();
