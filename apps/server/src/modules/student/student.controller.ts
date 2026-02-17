/**
 * 学员控制器：
 * 提供学员新增、单条查询、分页查询、更新、删除接口。
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateStudentDto } from "./dto/create-student.dto";
import { ListStudentDto } from "./dto/list-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { Student, StudentPageData, StudentService } from "./student.service";

@Controller("students")
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // 新增学员：name 必填，phone 可选且需满足长度约束。
  @Post()
  async createStudent(@Body() dto: CreateStudentDto): Promise<Student> {
    return this.studentService.create(dto);
  }

  // 学员分页列表：支持 page/pageSize/keyword。
  @Get()
  async getStudents(@Query() query: ListStudentDto): Promise<StudentPageData> {
    // 分页参数默认值
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    return this.studentService.findAll(page, pageSize, query.keyword);
  }

  // 单个学员详情：id 由 ParseIntPipe 转为 number。
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number): Promise<Student> {
    return this.studentService.findOne(id);
  }

  // 更新学员：支持局部更新 name 或 phone。
  @Patch(":id")
  async updateStudent(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentService.update(id, dto);
  }

  // 删除学员：不存在时返回 404。
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: number): Promise<Student> {
    return this.studentService.remove(id);
  }
}
