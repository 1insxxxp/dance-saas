/**
 * 课次服务：
 * 负责课次创建、时间范围查询与课次预约名单分页查询。
 */
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, ClassSession as PrismaClassSession, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { ListSessionDto } from "./dto/list-session.dto";

export type ClassSession = PrismaClassSession;
export type SessionBookingItem = Prisma.BookingGetPayload<{ include: { student: true } }>;

export interface SessionBookingsPageData {
  items: SessionBookingItem[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSessionDto): Promise<ClassSession> {
    // 创建课次前先确认课程存在，避免脏外键请求进入数据库层。
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException("course not found");
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    // 服务层再做一次业务校验，确保结束时间晚于开始时间。
    if (endTime <= startTime) {
      throw new BadRequestException("endTime must be greater than startTime");
    }

    // capacity 未传时继承课程容量
    return this.prisma.classSession.create({
      data: {
        courseId: dto.courseId,
        startTime,
        endTime,
        capacity: dto.capacity ?? course.capacity,
      },
    });
  }

  async findByRange(query: ListSessionDto): Promise<ClassSession[]> {
    const from = query.from;
    const to = query.to;
    // 保护性校验：时间区间上下界颠倒时直接拒绝。
    if (from && to && from > to) {
      throw new BadRequestException("from must be less than or equal to to");
    }

    // 动态拼接 where，兼容仅 from / 仅 to / from+to 三种情况。
    const where: Prisma.ClassSessionWhereInput = {};
    if (from || to) {
      where.startTime = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    return this.prisma.classSession.findMany({
      where,
      orderBy: { startTime: "asc" },
    });
  }

  async getBookingsBySession(
    sessionId: number,
    page: number,
    pageSize: number,
  ): Promise<SessionBookingsPageData> {
    // 先验证课次存在性，避免后续分页查询返回误导性空列表。
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException("session not found");
    }

    // 与学员/课程列表分页规则一致：skip + take。
    const skip = (page - 1) * pageSize;
    const where: Prisma.BookingWhereInput = {
      classSessionId: sessionId,
      status: BookingStatus.BOOKED,
    };

    // 只统计和返回有效预约（BOOKED）
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: { student: true },
        orderBy: { id: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
