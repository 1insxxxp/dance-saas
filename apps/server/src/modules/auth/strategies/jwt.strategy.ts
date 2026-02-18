/**
 * JWT 策略：
 * 负责解析并校验 Bearer Token，仅允许 access token 进入受保护接口。
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not set");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload): { userId: number; username: string; role: Role } {
    // 仅 access token 可通过守卫，防止 refresh token 用于访问业务接口。
    if (payload.tokenType !== "access") {
      throw new UnauthorizedException("invalid access token");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
