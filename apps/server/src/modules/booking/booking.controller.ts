/**
 * 预约控制器：
 * 提供预约创建与取消接口。
 */
import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { Booking, BookingService } from "./booking.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // 创建预约：会在 service 内执行存在性、容量、重复预约校验。
  @Post()
  async createBooking(@Body() dto: CreateBookingDto): Promise<Booking> {
    return this.bookingService.create(dto);
  }

  // 取消预约：幂等处理，重复取消会返回当前记录。
  @Post(":id/cancel")
  async cancelBooking(@Param("id", ParseIntPipe) id: number): Promise<Booking> {
    return this.bookingService.cancel(id);
  }
}
