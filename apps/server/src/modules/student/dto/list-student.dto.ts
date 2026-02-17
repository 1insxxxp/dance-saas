/**
 * 学员列表查询 DTO：
 * 定义分页参数与 name 关键词搜索参数。
 */
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ListStudentDto {
  // 页码：默认在 controller 中兜底为 1。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // 每页条数：默认在 controller 中兜底为 10。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  // keyword 会在 service 中用于 name 的 contains 查询。
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;
}
