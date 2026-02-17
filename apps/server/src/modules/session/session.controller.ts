/**
 * 课次控制器：
 * 提供课次创建、时间范围查询与课次预约名单分页查询接口。
 */
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CreateSessionDto } from "./dto/create-session.dto";
import { ListSessionBookingsDto } from "./dto/list-session-bookings.dto";
import { ListSessionDto } from "./dto/list-session.dto";
import { ClassSession, SessionBookingsPageData, SessionService } from "./session.service";

@Controller("sessions")
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // 创建课次：若 capacity 未传，则由 service 继承课程容量。
  @Post()
  async createSession(@Body() dto: CreateSessionDto): Promise<ClassSession> {
    return this.sessionService.create(dto);
  }

  // 按时间范围查询课次，用于时间表展示。
  @Get()
  async getSessions(@Query() query: ListSessionDto): Promise<ClassSession[]> {
    return this.sessionService.findByRange(query);
  }

  // 查询某课次预约名单，支持分页。
  @Get(":id/bookings")
  async getSessionBookings(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: ListSessionBookingsDto,
  ): Promise<SessionBookingsPageData> {
    // 分页默认值与其他模块保持一致。
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.sessionService.getBookingsBySession(id, page, pageSize);
  }
}
