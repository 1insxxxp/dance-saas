import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const apiBase = String(import.meta.env.VITE_API_BASE ?? "").trim();
if (!apiBase) {
  throw new Error(
    "Missing env: VITE_API_BASE. Please set it in apps/student-h5/.env.development",
  );
}

const instance = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;

    if (payload.code !== 0) {
      const error = new Error(payload.message || "request failed") as Error & {
        code?: number;
      };
      error.code = payload.code;
      throw error;
    }

    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message));
    }
    return Promise.reject(error);
  },
);

function unwrapData<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<T> {
  return promise.then((response) => response.data.data);
}

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.get<ApiResponse<T>>(url, config));
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.post<ApiResponse<T>>(url, data, config));
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.patch<ApiResponse<T>>(url, data, config));
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.put<ApiResponse<T>>(url, data, config));
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.delete<ApiResponse<T>>(url, config));
  },
};

export default request;
