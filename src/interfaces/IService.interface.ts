export interface IService<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    meta?: Record<string, any>
}