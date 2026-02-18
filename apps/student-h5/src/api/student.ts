import { request } from "./request";

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

export interface CreateStudentPayload {
  name: string;
  phone?: string | null;
}

export interface UpdateStudentPayload {
  name?: string;
  phone?: string | null;
}

export interface StudentApiResponse {
  code: number;
  message: string;
  data: Student;
}

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<StudentListData> {
  return request.get<StudentListData>("/students", { params });
}

export async function createStudent(
  payload: CreateStudentPayload,
): Promise<Student> {
  return request.post<Student>("/students", payload);
}

export async function updateStudent(
  id: number,
  payload: UpdateStudentPayload,
): Promise<StudentApiResponse> {
  const data = await request.patch<Student>(`/students/${id}`, payload);
  return {
    code: 0,
    message: "ok",
    data,
  };
}

export async function removeStudent(id: number): Promise<Student> {
  return request.delete<Student>(`/students/${id}`);
}

export const deleteStudent = removeStudent;
