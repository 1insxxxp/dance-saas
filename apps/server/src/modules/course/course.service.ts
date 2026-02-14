import { Injectable } from "@nestjs/common";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Course {
  id: number;
  name: string;
  teacher: string;
  time: string;
  capacity: number;
}

@Injectable()
export class CourseService {
  findAll(): Course[] {
    return [
      {
        id: 1,
        name: "爵士基础",
        teacher: "小美",
        time: "2026-03-01 19:00",
        capacity: 20,
      },
    ];
  }
}

