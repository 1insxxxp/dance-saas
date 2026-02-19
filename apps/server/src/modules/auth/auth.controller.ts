/**
 * 认证控制器：
 * 提供登录、刷新令牌、退出登录接口。
 */
import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { randomBytes } from "node:crypto";
import { Public } from "./decorators/public.decorator";
import { AuthService } from "./auth.service";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const CSRF_TOKEN_COOKIE_NAME = "csrfToken";
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth/refresh";
const CSRF_TOKEN_COOKIE_PATH = "/";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim();
type CookieSameSite = "lax" | "none";

interface CookieSecurityOptions {
  sameSite: CookieSameSite;
  secure: boolean;
  domain?: string;
}

interface RefreshCookieOptions extends CookieSecurityOptions {
  httpOnly: true;
  path: string;
  maxAge: number;
}

interface CsrfCookieOptions extends CookieSecurityOptions {
  httpOnly: false;
  path: string;
  maxAge: number;
}

function buildCookieSecurityOptions(): CookieSecurityOptions {
  const securityOptions: CookieSecurityOptions = {
    sameSite: IS_PRODUCTION ? "none" : "lax",
    secure: IS_PRODUCTION,
  };

  if (IS_PRODUCTION && COOKIE_DOMAIN) {
    securityOptions.domain = COOKIE_DOMAIN;
  }

  return securityOptions;
}

/**
 * 生成 refreshToken Cookie 配置：
 * - 开发环境：sameSite=lax + secure=false
 * - 生产环境：sameSite=none + secure=true（便于跨域前后端）
 * - 生产环境可选 domain（来自 COOKIE_DOMAIN）
 */
function buildRefreshCookieOptions(): RefreshCookieOptions {
  const securityOptions = buildCookieSecurityOptions();
  const options: RefreshCookieOptions = {
    ...securityOptions,
    httpOnly: true,
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };

  return options;
}

/**
 * 生成 csrfToken Cookie 配置（可由前端读取，作为 x-csrf-token 提交）。
 */
function buildCsrfCookieOptions(): CsrfCookieOptions {
  const securityOptions = buildCookieSecurityOptions();
  const options: CsrfCookieOptions = {
    ...securityOptions,
    httpOnly: false,
    path: CSRF_TOKEN_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };

  return options;
}

/**
 * clearCookie 需要与 setCookie 使用一致的核心参数。
 */
function buildRefreshCookieClearOptions(): Omit<RefreshCookieOptions, "maxAge"> {
  const options = buildRefreshCookieOptions();
  return {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    ...(options.domain ? { domain: options.domain } : {}),
  };
}

function buildCsrfCookieClearOptions(): Omit<CsrfCookieOptions, "maxAge"> {
  const options = buildCsrfCookieOptions();
  return {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    ...(options.domain ? { domain: options.domain } : {}),
  };
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

interface RequestUser {
  userId: number;
}

interface RequestWithUser {
  cookies?: Record<string, string | undefined>;
  user?: RequestUser;
}

interface AccessTokenResponse {
  token: string;
  accessToken: string;
}

interface CookieResponse {
  cookie: (name: string, value: string, options?: unknown) => void;
  clearCookie: (name: string, options?: unknown) => void;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.authService.login(dto.username, dto.password);
    const refreshCookieOptions = buildRefreshCookieOptions();
    const csrfCookieOptions = buildCsrfCookieOptions();
    const csrfToken = randomBytes(32).toString("hex");

    // refreshToken 不放在 JSON，写入 httpOnly cookie。
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      tokens.refreshToken,
      refreshCookieOptions,
    );

    // csrfToken 可由前端读取并通过 x-csrf-token 回传，形成 Double Submit 校验。
    res.cookie(CSRF_TOKEN_COOKIE_NAME, csrfToken, csrfCookieOptions);

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
    };
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<AccessTokenResponse> {
    const refreshCookieOptions = buildRefreshCookieOptions();
    const csrfCookieOptions = buildCsrfCookieOptions();
    const csrfToken = randomBytes(32).toString("hex");

    // refreshToken 从 cookie 读取，不再从 body 读取。
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (typeof refreshToken !== "string" || !refreshToken.trim()) {
      throw new UnauthorizedException("invalid refresh token");
    }

    const tokens = await this.authService.refresh(refreshToken);

    // 刷新成功后轮换 refreshToken cookie。
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      tokens.refreshToken,
      refreshCookieOptions,
    );
    // 刷新时同步续期 csrfToken，保持 cookie 生命周期一致。
    res.cookie(CSRF_TOKEN_COOKIE_NAME, csrfToken, csrfCookieOptions);

    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
    };
  }

  @Post("logout")
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<{ success: true }> {
    const refreshCookieClearOptions = buildRefreshCookieClearOptions();
    const csrfCookieClearOptions = buildCsrfCookieClearOptions();

    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException("Unauthorized");
    }

    await this.authService.logout(userId);

    // 登出时清理 refresh cookie。
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshCookieClearOptions);
    // 同步清理 csrf cookie。
    res.clearCookie(CSRF_TOKEN_COOKIE_NAME, csrfCookieClearOptions);

    return { success: true };
  }
}
