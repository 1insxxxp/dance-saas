/**
 * Public 装饰器：
 * 标记无需 JWT 鉴权的接口（如登录接口）。
 */
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
