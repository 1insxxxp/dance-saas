import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * 后端统一响应结构。
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * refresh 接口返回的数据结构（兼容 token / accessToken 两种字段）。
 */
interface RefreshTokenResult {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * 给 axios 请求配置扩展 _retry 标记，防止 401 重试死循环。
 */
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// 本地存储键名（兼容历史 token 键）。
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LEGACY_TOKEN_KEY = "token";
const ROLE_KEY = "role";

// 登录页路径与登出事件名。
const LOGIN_PATH = "/login";
const AUTH_LOGOUT_EVENT = "auth:logout";

// 读取并校验 API 基础地址。
const apiBase = String(import.meta.env.VITE_API_BASE ?? "").trim();
if (!apiBase) {
  throw new Error(
    "Missing env: VITE_API_BASE. Please set it in apps/student-h5/.env.development",
  );
}

/**
 * 业务请求实例：挂载自动续签 + 重放逻辑。
 */
const instance = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

/**
 * 认证专用实例：仅用于 refresh，请求链不走自动续签拦截，避免递归。
 */
const authClient = axios.create({
  baseURL: apiBase,
  timeout: 10000,
});

/**
 * refresh 锁：并发多个 401 时只发一次 refresh，请求共享同一个 Promise。
 */
let refreshPromise: Promise<string> | null = null;

/**
 * 读取 accessToken（先读新键，再兼容旧键）。
 */
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

/**
 * 读取 refreshToken。
 */
function getRefreshToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
}

/**
 * 将 refresh 成功后的新 token 写回本地，并返回新的 accessToken。
 */
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

/**
 * 清理鉴权信息并跳转登录页（只在 refresh 失败时执行）。
 */
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

/**
 * 判断当前请求是否是 refresh 请求。
 */
function isRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  const url = config?.url ?? "";
  return url.includes("/auth/refresh");
}

/**
 * 统一将未知错误转换为 Error 实例，便于上层 message 展示。
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("request failed");
}

/**
 * 执行 refresh 续签：
 * 1) 没有 refreshToken 直接失败
 * 2) 有并发时复用 refreshPromise
 * 3) 成功后更新本地 token
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

/**
 * 用新 accessToken 重放原请求。
 */
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

/**
 * 请求拦截：每个请求自动注入 accessToken。
 */
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

/**
 * 响应拦截：
 * - 业务 code=401 或 HTTP 401 时尝试 refresh + 重放
 * - 仅 refresh 失败才清 token 跳登录
 */
instance.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data;

    // 业务成功直接返回。
    if (payload.code === 0) {
      return response;
    }

    // 业务 401：先续签，再重放。
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

    // 其他业务错误直接抛出。
    const businessError = new Error(payload.message || "request failed") as Error & {
      code?: number;
    };
    businessError.code = payload.code;
    throw businessError;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const statusCode = error.response?.status;

    // 以下场景不做重试：
    // 1) 无 config
    // 2) refresh 请求自身失败
    // 3) 已经重试过
    if (!config || isRefreshRequest(config) || config._retry) {
      if (error.response?.data?.message) {
        return Promise.reject(new Error(error.response.data.message));
      }
      return Promise.reject(normalizeError(error));
    }
    // HTTP 401：先续签，再重放。
    if (statusCode === 401) {
      try {
        return await replayRequestWithNewToken(config);
      } catch (refreshError) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(normalizeError(refreshError));
      }
    }

    // 其他 HTTP 错误按原信息抛出。
    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message));
    }

    return Promise.reject(normalizeError(error));
  },
);

/**
 * 从统一响应结构中解包 data。
 */
function unwrapData<T>(
  promise: Promise<AxiosResponse<ApiResponse<T>>>,
): Promise<T> {
  return promise.then((response) => response.data.data);
}

/**
 * 对外请求方法封装（保持原有调用方式不变）。
 */
export const request = {
  /** GET 请求 */
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.get<ApiResponse<T>>(url, config));
  },

  /** POST 请求 */
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.post<ApiResponse<T>>(url, data, config));
  },

  /** PATCH 请求 */
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.patch<ApiResponse<T>>(url, data, config));
  },

  /** PUT 请求 */
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.put<ApiResponse<T>>(url, data, config));
  },

  /** DELETE 请求 */
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrapData<T>(instance.delete<ApiResponse<T>>(url, config));
  },
};

export default request;
