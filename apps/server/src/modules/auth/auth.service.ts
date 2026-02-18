/**
 * 认证服务：
 * 提供登录、刷新、登出能力，统一维护双 token 与 refresh token 持久化。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Admin, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

const BCRYPT_SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const INVALID_REFRESH_MESSAGE = "invalid refresh token";

type TokenType = "access" | "refresh";

interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
  tokenType: TokenType;
  tokenId?: string;
  iat?: number;
  exp?: number;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<AuthTokenResponse> {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException("username or password is incorrect");
    }

    const isPasswordValid = await this.verifyPassword(admin, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("username or password is incorrect");
    }

    const tokens = await this.issueTokenPair(admin);
    return this.toAuthTokenResponse(tokens);
  }

  async refresh(refreshToken: string): Promise<AuthTokenResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin?.refreshTokenHash) {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    let isMatched = false;
    try {
      isMatched = await bcrypt.compare(refreshToken, admin.refreshTokenHash);
    } catch {
      isMatched = false;
    }

    if (!isMatched) {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    const tokens = await this.issueTokenPair(admin);
    return this.toAuthTokenResponse(tokens);
  }

  async logout(adminId: number): Promise<void> {
    // 使用 updateMany 避免目标账号不存在时抛出异常，登出接口保持幂等。
    await this.prisma.admin.updateMany({
      where: { id: adminId },
      data: { refreshTokenHash: null },
    });
  }

  private async verifyPassword(admin: Admin, password: string): Promise<boolean> {
    let isPasswordValid = false;

    try {
      isPasswordValid = await bcrypt.compare(password, admin.password);
    } catch {
      isPasswordValid = false;
    }

    // 兼容历史明文密码：首次登录成功后自动升级为 bcrypt 哈希。
    if (!isPasswordValid && admin.password === password) {
      isPasswordValid = true;
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });
    }

    return isPasswordValid;
  }

  private async issueTokenPair(
    admin: Pick<Admin, "id" | "username" | "role">,
  ): Promise<TokenPair> {
    const payloadBase = {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...payloadBase,
          tokenType: "access",
          tokenId: randomUUID(),
        },
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      ),
      this.jwtService.signAsync(
        {
          ...payloadBase,
          tokenType: "refresh",
          tokenId: randomUUID(),
        },
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
      ),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException(INVALID_REFRESH_MESSAGE);
    }

    return payload;
  }

  private toAuthTokenResponse(tokens: TokenPair): AuthTokenResponse {
    return {
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
