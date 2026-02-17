/**
 * 课次预约名单分页 DTO：
 * 定义预约名单查询的分页参数。
 */
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListSessionBookingsDto {
  // 页码：controller 中默认为 1。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // 每页条数：controller 中默认为 10，且最大 50。
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
