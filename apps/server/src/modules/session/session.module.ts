/**
 * 课次模块：
 * 装配课次控制器与服务，并引入 PrismaModule。
 */
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

@Module({
  // 课次模块依赖 PrismaModule 执行课程与预约关联查询。
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
