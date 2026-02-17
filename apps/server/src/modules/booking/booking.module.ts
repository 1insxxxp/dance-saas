/**
 * 预约模块：
 * 装配预约控制器与服务，并引入 PrismaModule。
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";

@Module({
  // 预约模块使用 PrismaModule 访问 booking/session/student 三张表。
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
