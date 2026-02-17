/**
 * 预约服务：
 * 负责预约创建与取消，并执行容量、重复预约、数据存在性校验。
 */
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Booking as PrismaBooking, BookingStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

export type Booking = PrismaBooking;

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    try {
      // 核心预约逻辑放在事务内，避免并发下出现容量与写入不一致。
      return await this.prisma.$transaction(async (tx) => {
        const session = await tx.classSession.findUnique({
          where: { id: dto.classSessionId },
        });
        if (!session) {
          throw new NotFoundException("session not found");
        }

        const student = await tx.student.findUnique({
          where: { id: dto.studentId },
        });
        if (!student) {
          throw new NotFoundException("student not found");
        }

        // 只统计 BOOKED；CANCELLED 不占名额。
        const bookedCount = await tx.booking.count({
          where: {
            classSessionId: dto.classSessionId,
            status: BookingStatus.BOOKED,
          },
        });
        if (bookedCount >= session.capacity) {
          throw new ConflictException("session is full");
        }

        // 预约创建默认写入 BOOKED 状态。
        return tx.booking.create({
          data: {
            studentId: dto.studentId,
            classSessionId: dto.classSessionId,
            status: BookingStatus.BOOKED,
          },
        });
      });
    } catch (error) {
      // P2002: 触发 (studentId, classSessionId) 唯一约束
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // 命中联合唯一键 (studentId, classSessionId)。
        throw new ConflictException("booking already exists");
      }
      throw error;
    }
  }

  async cancel(id: number): Promise<Booking> {
    // 先查询再更新，便于区分“不存在”和“重复取消”两类情况。
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      throw new NotFoundException("booking not found");
    }

    // 已取消记录重复取消时，直接返回当前状态。
    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    // 状态切换到 CANCELLED，历史记录仍保留在 booking 表。
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
