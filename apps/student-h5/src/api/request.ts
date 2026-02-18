import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface RefreshTokenResult {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LEGACY_TOKEN_KEY = "token";
const ROLE_KEY = "role";
const LOGIN_PATH = "/login";
const AUTH_LOGOUT_EVENT = "auth:logout";

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

// 独立认证客户端：只负责 refresh，不挂载 401 自动续签拦截器，避免递归。
const authClient = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

let refreshPromise: Promise<string> | null = null;

function getAccessToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.localStorage.getItem(LEGACY_TOKEN_KEY) ??
    ""
  );
}

function getRefreshToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
}

function persistTokens(data: RefreshTokenResult): string {
  if (typeof window === "undefined") {
    throw new Error("window is not available");
  }

  const nextAccessToken = data.accessToken ?? data.token;
  const nextRefreshToken = data.refreshToken;

  if (!nextAccessToken || !nextRefreshToken) {
    throw new Error("invalid refresh response");
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
  window.localStorage.setItem(LEGACY_TOKEN_KEY, nextAccessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
  return nextAccessToken;
}

function clearAuthAndRedirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));

  if (window.location.pathname !== LOGIN_PATH) {
    window.history.replaceState(null, "", LOGIN_PATH);
  }
}

function isRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  const url = config?.url ?? "";
  return url.includes("/auth/refresh");
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("request failed");
}

/**
 * 验收步骤：
 * 1) 手动把 localStorage.accessToken 改成无效值
 * 2) 页面点击刷新列表
 * 3) 预期：不会跳登录；会先 refresh；然后原请求自动重放并成功返回
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("missing refresh token");
  }

  refreshPromise = authClient
    .post<ApiResponse<RefreshTokenResult>>("/auth/refresh", { refreshToken })
    .then((response) => {
      const payload = response.data;
      if (payload.code !== 0) {
        throw new Error(payload.message || "refresh failed");
      }

      return persistTokens(payload.data ?? {});
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function replayRequestWithNewToken(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse<ApiResponse<unknown>>> {
  const nextAccessToken = await refreshAccessToken();
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${nextAccessToken}`);
  config.headers = headers;
  config._retry = true;
  return instance.request(config);
}

instance.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    config.headers = headers;
  }

  return config;
});

instance.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;
    if (payload.code === 0) {
      return response;
    }
    if (payload.code === 401) {
      const config = response.config as InternalAxiosRequestConfig;
      if (config._retry || isRefreshRequest(config)) {
        throw new Error(payload.message || "unauthorized");
      }
      try {
        return await replayRequestWithNewToken(config);
      } catch (error) {
        clearAuthAndRedirectToLogin();
        throw normalizeError(error);
      }
    }

    const businessError = new Error(payload.message || "request failed") as Error & {
      code?: number;
    };
    businessError.code = payload.code;
    throw businessError;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const statusCode = error.response?.status;

    if (!config || isRefreshRequest(config) || config._retry) {
      if (error.response?.data?.message) {
        return Promise.reject(new Error(error.response.data.message));
      }
      return Promise.reject(normalizeError(error));
    }

    if (statusCode === 401) {
      try {
        return await replayRequestWithNewToken(config);
      } catch (refreshError) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(normalizeError(refreshError));
      }
    }

    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message));
    }

    return Promise.reject(normalizeError(error));
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
