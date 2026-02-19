/**
 * CSRF 守卫：
 * 使用 Double Submit Cookie 方案校验 csrfToken，保护非安全方法请求。
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

interface RequestWithCsrf {
  method?: string;
  path?: string;
  url?: string;
  originalUrl?: string;
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * 仅排除登录与刷新接口，其他写操作都需要通过 CSRF 校验。
 */
function isCsrfExcludedPath(requestPath: string): boolean {
  const normalizedPath =
    requestPath.length > 1 && requestPath.endsWith("/")
      ? requestPath.slice(0, -1)
      : requestPath;

  return (
    normalizedPath.endsWith("/auth/login") ||
    normalizedPath.endsWith("/auth/refresh")
  );
}

function extractRequestPath(request: RequestWithCsrf): string {
  const rawPath = request.originalUrl ?? request.url ?? request.path ?? "";
  const queryStart = rawPath.indexOf("?");
  return queryStart >= 0 ? rawPath.slice(0, queryStart) : rawPath;
}

function readCsrfHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
): string {
  const headerValue = headers?.[CSRF_HEADER_NAME];
  if (Array.isArray(headerValue)) {
    return String(headerValue[0] ?? "").trim();
  }
  return String(headerValue ?? "").trim();
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithCsrf>();
    const requestMethod = String(request.method ?? "GET").toUpperCase();

    if (SAFE_METHODS.has(requestMethod)) {
      return true;
    }

    const requestPath = extractRequestPath(request);
    if (isCsrfExcludedPath(requestPath)) {
      return true;
    }

    const csrfCookieToken = String(
      request.cookies?.[CSRF_COOKIE_NAME] ?? "",
    ).trim();
    const csrfHeaderToken = readCsrfHeader(request.headers);

    if (
      !csrfCookieToken ||
      !csrfHeaderToken ||
      csrfCookieToken !== csrfHeaderToken
    ) {
      throw new ForbiddenException("invalid csrf token");
    }

    return true;
  }
}
