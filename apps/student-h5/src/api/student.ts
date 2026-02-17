import { http } from "../lib/http";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Student {
  id: number;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface StudentListData {
  list: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListStudentsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<StudentListData> {
  const res = await http.get<ApiResponse<StudentListData>>("/students", { params });
  return res.data.data;
}

export async function createStudent(payload: {
  name: string;
  phone?: string;
}): Promise<Student> {
  const res = await http.post<ApiResponse<Student>>("/students", payload);
  return res.data.data;
}

export async function deleteStudent(id: number): Promise<Student> {
  const res = await http.delete<ApiResponse<Student>>(`/students/${id}`);
  return res.data.data;
}
