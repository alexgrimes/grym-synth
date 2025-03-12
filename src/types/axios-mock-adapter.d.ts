declare module 'axios-mock-adapter' {
  import { AxiosInstance, AxiosRequestConfig } from 'axios';

  interface MockAdapterOptions {
    delayResponse?: number;
    onNoMatch?: 'passthrough' | 'throwException';
  }

  interface MockAdapterInstance {
    adapter: (config: AxiosRequestConfig) => Promise<any>;
    reset: () => void;
    restore: () => void;
    resetHistory: () => void;
    onGet: (url: string, headers?: any) => MockAdapterHandler;
    onPost: (url: string, headers?: any) => MockAdapterHandler;
    onPut: (url: string, headers?: any) => MockAdapterHandler;
    onPatch: (url: string, headers?: any) => MockAdapterHandler;
    onDelete: (url: string, headers?: any) => MockAdapterHandler;
    onHead: (url: string, headers?: any) => MockAdapterHandler;
    onOptions: (url: string, headers?: any) => MockAdapterHandler;
    onAny: (url: string, headers?: any) => MockAdapterHandler;
  }

  interface MockAdapterHandler {
    reply: (status: number, data?: any, headers?: any) => MockAdapterInstance;
    replyOnce: (status: number, data?: any, headers?: any) => MockAdapterInstance;
    networkError: () => MockAdapterInstance;
    networkErrorOnce: () => MockAdapterInstance;
    timeout: () => MockAdapterInstance;
    timeoutOnce: () => MockAdapterInstance;
    passThrough: () => MockAdapterInstance;
  }

  class MockAdapter implements MockAdapterInstance {
    constructor(axiosInstance: AxiosInstance, options?: MockAdapterOptions);
    adapter: (config: AxiosRequestConfig) => Promise<any>;
    reset: () => void;
    restore: () => void;
    resetHistory: () => void;
    onGet: (url: string, headers?: any) => MockAdapterHandler;
    onPost: (url: string, headers?: any) => MockAdapterHandler;
    onPut: (url: string, headers?: any) => MockAdapterHandler;
    onPatch: (url: string, headers?: any) => MockAdapterHandler;
    onDelete: (url: string, headers?: any) => MockAdapterHandler;
    onHead: (url: string, headers?: any) => MockAdapterHandler;
    onOptions: (url: string, headers?: any) => MockAdapterHandler;
    onAny: (url: string, headers?: any) => MockAdapterHandler;
  }

  export default MockAdapter;
}