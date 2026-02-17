/**
 * 全局异常过滤器：
 * 统一处理 HttpException 与未知异常，输出标准错误结构。
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

interface ApiErrorResponse {
  code: number;
  message: string;
  data: unknown;
}

interface HttpExceptionBody {
  message?: string | string[];
  data?: unknown;
}

interface HttpResponseLike {
  status: (code: number) => {
    json: (body: ApiErrorResponse) => void;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // 从当前 HTTP 上下文中拿到响应对象，后续统一写回 JSON。
    const response = host.switchToHttp().getResponse<HttpResponseLike>();

    // 已知 HttpException：保留状态码并尽量提取业务 message/data。
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const { message, data } = this.parseHttpExceptionBody(
        exception.getResponse(),
        exception.message,
      );

      response.status(statusCode).json({
        code: statusCode,
        message,
        data,
      });
      return;
    }

    // 未知异常统一隐藏内部细节，避免泄露实现信息。
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "internal error",
      data: null,
    });
  }

  /**
   * 兼容 Nest 默认异常体的 string / object 两种形态。
   */
  private parseHttpExceptionBody(
    body: string | object,
    fallbackMessage: string,
  ): { message: string; data: unknown } {
    // 当异常体是纯字符串时，直接作为 message 返回。
    if (typeof body === "string") {
      return { message: body, data: null };
    }

    // 当异常体是对象时，兼容 message 为 string 或 string[] 两种形态。
    const typedBody = (body ?? {}) as HttpExceptionBody;
    const message = Array.isArray(typedBody.message)
      ? typedBody.message.join(", ")
      : typedBody.message ?? fallbackMessage;

    return {
      message,
      data: typedBody.data ?? null,
    };
  }
}
