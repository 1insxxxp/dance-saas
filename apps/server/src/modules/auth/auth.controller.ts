/**
 * 认证控制器：
 * 提供登录、刷新令牌、退出登录接口。
 */
import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { Public } from "./decorators/public.decorator";
import { AuthService, AuthTokenResponse } from "./auth.service";

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

interface RequestUser {
  userId: number;
}

interface RequestWithUser {
  user?: RequestUser;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto.username, dto.password);
  }

  @Public()
  @Post("refresh")
  async refresh(@Body() dto: RefreshDto): Promise<AuthTokenResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  async logout(@Req() req: RequestWithUser): Promise<{ success: true }> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException("Unauthorized");
    }

    await this.authService.logout(userId);
    return { success: true };
  }
}
