/**
 * 学员服务：
 * 负责学员增删改查、分页搜索，并把 Prisma 异常转换为业务异常。
 */
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Student as PrismaStudent } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

export type Student = PrismaStudent;

export interface StudentPageData {
  list: Student[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    try {
      return await this.prisma.student.create({
        data: {
          name: dto.name,
          phone: dto.phone ?? null,
        },
      });
    } catch (error) {
      // P2002: 唯一约束冲突（这里主要是 phone 冲突）
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("phone already exists");
      }
      throw error;
    }
  }

  async findOne(id: number): Promise<Student> {
    // findUnique 以主键查询，查询成本最低。
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException("student not found");
    }
    return student;
  }

  async findAll(
    page: number,
    pageSize: number,
    keyword?: string,
  ): Promise<StudentPageData> {
    // 统一在 service 层计算分页偏移，避免 controller 重复逻辑。
    const skip = (page - 1) * pageSize;
    // keyword 去除首尾空白，防止全空格造成无意义过滤。
    const normalizedKeyword = keyword?.trim();
    const where: Prisma.StudentWhereInput = normalizedKeyword
      ? { name: { contains: normalizedKeyword } }
      : {};

    // 使用相同 where 条件查询列表与总数，保证分页统计一致。
    const [list, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    try {
      return await this.prisma.student.update({
        where: { id },
        data: {
          // 仅更新请求中出现的字段，避免误覆盖其他字段。
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        },
      });
    } catch (error) {
      // P2025: 目标记录不存在
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("student not found");
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // phone 唯一约束冲突。
        throw new ConflictException("phone already exists");
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Student> {
    try {
      // delete 返回被删除的记录，可直接给前端用于回显。
      return await this.prisma.student.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("student not found");
      }
      throw error;
    }
  }
}
