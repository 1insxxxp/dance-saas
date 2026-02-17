/**
 * 全局响应拦截器：
 * 将所有成功返回统一包装为 { code, message, data }。
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    // 这里暂不需要读取请求上下文，保留参数是为了符合拦截器签名。
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    // 仅处理成功流；异常会直接交给全局异常过滤器处理。
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: "ok",
        data,
      })),
    );
  }
}
