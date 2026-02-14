export class CreateCourseDto {
  name!: string; // 课程名称
  teacher!: string; // 授课老师
  time!: string; // 上课时间（字符串）
  capacity!: number; // 容量
}
