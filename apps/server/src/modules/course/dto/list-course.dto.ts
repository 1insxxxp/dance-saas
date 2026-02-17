/**
 * 课程分页查询 DTO：
 * 定义 page / pageSize 参数并限制取值范围。
 */
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListCourseDto {
  // 当前页码：从 1 开始计数。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // 每页条数：上限 50，避免单次查询量过大。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
