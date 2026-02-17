/**
 * 课次时间范围查询 DTO：
 * 支持 from / to 作为可选时间区间过滤。
 */
import { Type } from "class-transformer";
import { IsDate, IsOptional } from "class-validator";

export class ListSessionDto {
  // 开始时间下界（包含）。
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  // 开始时间上界（包含）。
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
