/**
 * Roles 装饰器：
 * 用于声明接口允许访问的角色列表，供 RolesGuard 在运行时校验。
 */
import { SetMetadata } from "@nestjs/common";
import { Role } from "@prisma/client";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
