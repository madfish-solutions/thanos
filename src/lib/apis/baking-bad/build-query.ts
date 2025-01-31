import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { pick } from 'lodash';

type RequestParams<T> = T & Omit<AxiosRequestConfig, 'method' | 'url' | 'params'>;

export function buildQuery<P extends object, R = any>(
  api: AxiosInstance,
  method: 'GET' | 'POST',
  path: ((params: RequestParams<P>) => string) | string,
  toQueryParams?: ((params: RequestParams<P>) => Record<string, unknown>) | Array<keyof P>
) {
  return async (params: RequestParams<P>) => {
    const url = typeof path === 'function' ? path(params) : path;
    const pickParams = toQueryParams && typeof toQueryParams !== 'function' ? pick(params, toQueryParams) : undefined;
    const queryParams = typeof toQueryParams === 'function' ? toQueryParams(params) : pickParams;

    const r = await api.request<R>({
      method,
      url,
      params: queryParams,
      ...params
    });
    return r.data;
  };
}
