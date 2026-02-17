/**
 * 创建学员 DTO：
 * 定义新增学员时 name / phone 的格式约束。
 */
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateStudentDto {
  // 学员姓名：至少 1 个字符。
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  // phone 可选，但一旦传入必须满足长度范围。
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  phone?: string;
}
