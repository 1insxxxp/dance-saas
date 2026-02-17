/**
 * 创建课次 DTO：
 * 定义课次创建参数及容量范围。
 */
import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateSessionDto {
  // 关联课程 ID。
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId!: number;

  // 时间字段支持字符串入参并自动转换为 Date
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Date)
  @IsDate()
  endTime!: Date;

  // 可选容量：未传时 service 会自动使用课程默认容量。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;
}
