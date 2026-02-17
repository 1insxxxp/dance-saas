/**
 * 创建课程 DTO：
 * 定义课程新增时的字段约束。
 */
import { Type } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCourseDto {
  // 课程名称：用于前台展示与检索。
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  // 授课老师：保留基础长度限制，避免超长脏数据。
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  teacher!: string;

  // 接收字符串日期并转换为 Date 再做校验
  @Type(() => Date)
  @IsDate()
  time!: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  capacity!: number;
}
