/**
 * 更新学员 DTO：
 * 支持按需更新 name / phone，字段均为可选。
 */
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateStudentDto {
  // 可选姓名更新：只在请求携带该字段时生效。
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  // 可选手机号更新：允许清空需显式传 null 的策略可在后续扩展。
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  phone?: string;
}
