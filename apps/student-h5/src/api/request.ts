import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const TOKEN_KEY = "token";
const LOGIN_PATH = "/login";
const AUTH_LOGOUT_EVENT = "auth:logout";

function clearTokenAndRedirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));

  if (window.location.pathname !== LOGIN_PATH) {
    window.history.replaceState(null, "", LOGIN_PATH);
  }
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

instance.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }

  return config;
});

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;

    if (payload.code !== 0) {
      if (payload.code === 401) {
        clearTokenAndRedirectToLogin();
      }
      const error = new Error(payload.message || "request failed") as Error & {
        code?: number;
      };
      error.code = payload.code;
      throw error;
    }

    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      clearTokenAndRedirectToLogin();
    }
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
