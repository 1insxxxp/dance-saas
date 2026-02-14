import { Injectable } from "@nestjs/common"; // 导入 NestJS 的 Injectable 装饰器
import { Course as PrismaCourse, Prisma } from "@prisma/client"; // 导入 Prisma 的 Course 类型和 Prisma 命名空间
import { PrismaService } from "../../prisma/prisma.service"; // 导入封装后的 Prisma 服务

export interface ApiResponse<T> { // 定义通用接口返回结构
  code: number; // 业务状态码
  message: string; // 提示信息
  data: T; // 返回数据载荷
} // 结束 ApiResponse 接口定义

export type Course = PrismaCourse; // 将业务 Course 类型映射为 Prisma 的 Course 类型

export interface CreateCourseDto { // 定义创建课程请求的数据结构
  name: string; // 课程名称
  teacher: string; // 授课老师
  time: string | Date; // 上课时间，支持字符串或 Date
  capacity: number; // 容量上限
} // 结束 CreateCourseDto 接口定义

@Injectable() // 标记该类可被 Nest 依赖注入
export class CourseService { // 课程业务服务类
  constructor(private readonly prisma: PrismaService) {} // 通过构造函数注入 PrismaService

  async findAll(): Promise<ApiResponse<Course[]>> { // 查询全部课程，按 id 倒序
    const courses = await this.prisma.course.findMany({ // 调用 Prisma 查询 Course 表
      orderBy: { id: "desc" }, // 指定按 id 降序排序
    }); // 返回查询结果
    return this.ok(courses); // 返回统一成功结构
  } // 结束 findAll 方法

  async create(dto: CreateCourseDto): Promise<ApiResponse<Course>> { // 创建课程记录
    const data: Prisma.CourseCreateInput = { // 组装 Prisma 创建参数
      ...dto, // 展开 dto 字段
      time: typeof dto.time === "string" ? new Date(dto.time) : dto.time, // 如果 time 是字符串则转换为 Date
    }; // 完成参数组装

    const course = await this.prisma.course.create({ data }); // 执行创建操作
    return this.ok(course); // 返回统一成功结构
  } // 结束 create 方法

  async findOne(id: number): Promise<ApiResponse<Course | null>> { // 根据 id 查询单条课程
    const course = await this.prisma.course.findUnique({ where: { id } }); // 调用 Prisma 按主键查询

    if (!course) { // 如果未查到数据
      return this.notFound(); // 返回 404 结构
    } // 结束未找到分支

    return this.ok(course); // 返回统一成功结构
  } // 结束 findOne 方法

  async remove(id: number): Promise<ApiResponse<Course | null>> { // 根据 id 删除课程
    try { // 开始异常捕获
      const course = await this.prisma.course.delete({ where: { id } }); // 调用 Prisma 删除记录
      return this.ok(course); // 返回统一成功结构
    } catch (error) { // 处理删除异常
      if ( // 判断是否为记录不存在错误
        error instanceof Prisma.PrismaClientKnownRequestError && // 判断 Prisma 已知错误类型
        error.code === "P2025" // P2025 表示目标记录不存在
      ) { // 进入记录不存在分支
        return this.notFound(); // 返回 404 结构
      } // 结束记录不存在分支

      throw error; // 其他异常继续抛出
    } // 结束异常处理
  } // 结束 remove 方法

  private ok<T>(data: T): ApiResponse<T> { // 构造统一成功返回
    return { // 返回成功对象
      code: 0, // 成功状态码
      message: "ok", // 成功消息
      data, // 成功数据
    }; // 完成返回对象
  } // 结束 ok 辅助方法

  private notFound(): ApiResponse<null> { // 构造未找到返回
    return { // 返回未找到对象
      code: 404, // 未找到状态码
      message: "not found", // 未找到消息
      data: null, // 无数据
    }; // 完成返回对象
  } // 结束 notFound 辅助方法
} // 结束 CourseService 类定义
