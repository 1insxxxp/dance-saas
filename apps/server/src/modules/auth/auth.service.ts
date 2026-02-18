/**
 * 认证服务：
 * 校验管理员账号密码，并在登录成功后签发 JWT。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ token: string }> {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || admin.password !== password) {
      throw new UnauthorizedException("username or password is incorrect");
    }

    const token = await this.jwtService.signAsync({
      sub: admin.id,
      username: admin.username,
    });

    return { token };
  }
}
