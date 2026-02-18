/**
 * 认证控制器：
 * 提供 POST /auth/login 登录接口。
 */
import { Body, Controller, Post } from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { Public } from "./decorators/public.decorator";
import { AuthService } from "./auth.service";

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto): Promise<{ token: string }> {
    return this.authService.login(dto.username, dto.password);
  }
}
