/**
 * 应用根模块：
 * 负责聚合全部业务模块，并注册根控制器与根服务。
 */
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { BookingModule } from "./modules/booking/booking.module";
import { CourseModule } from "./modules/course/course.module";
import { SessionModule } from "./modules/session/session.module";
import { StudentModule } from "./modules/student/student.module";

@Module({
  // 统一汇总业务模块；后续扩展模块时只需在这里追加 imports。
  // 模块装配顺序对功能无影响，按业务域分组便于维护。
  imports: [CourseModule, StudentModule, SessionModule, BookingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
