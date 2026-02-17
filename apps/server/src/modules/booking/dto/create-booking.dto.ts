/**
 * 创建预约 DTO：
 * 定义 studentId / classSessionId 的输入约束。
 */
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CreateBookingDto {
  // 学员 ID。
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;

  // 课次 ID。
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSessionId!: number;
}
