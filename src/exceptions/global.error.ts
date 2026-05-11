import {CustomErrorCode} from "./error.code.js";
import {config} from "../config";
import {FastifyError, FastifyReply, FastifyRequest} from "fastify";
import {CustomError} from "./operational.error.js";
import {ZodError} from "zod";

export enum ErrorFaultType {
    CLIENT = "client",
    SERVER = "server",
}

export enum TokenStatus {
    EXPIRED = "expired",
    INVALID = "invalid",
    MISSING = "missing",
}

export type TokenMeta = {
    status: TokenStatus;
    type?: string;
    issuedAt?: string;
    expiresAt?: string;
};

export interface ApiErrorResponse {
    success: false;
    status: string;
    statusCode: number;
    errorCode: CustomErrorCode;
    message: string;
    fault: ErrorFaultType;
    retryable: boolean;
    suggestedAction?: string;
    reason?: unknown;
    environment?: string;
    apiVersion?: string;
}

export interface ApiErrorOptions {
    statusCode: number;
    errorCode: CustomErrorCode;
    message: string;
    status?: string;
    retryable?: boolean;
    suggestedAction?: string;
    fault?: ErrorFaultType;
    environment?: string;
    apiVersion?: string;
    reason?: unknown;
}

export function createApiErrorResponse(
    options: ApiErrorOptions
): ApiErrorResponse {
    const {
        statusCode,
        errorCode,
        message,
        status = "error",
        retryable = false,
        suggestedAction,
        fault = ErrorFaultType.CLIENT,
        environment = config.environment,
        apiVersion = "1.0.0",
        reason,
    } = options;
    return {
        success: false,
        status,
        statusCode,
        errorCode,
        message,
        fault,
        retryable,
        suggestedAction,
        reason,
        environment,
        apiVersion,
    };
}

//Operational Error

function formatZodError(error: ZodError) {
    return error.issues.map(e => ({
        field: e.path.join("."),
        message: e.message
    }));
}

function getPrimaryZodMessage(error: ZodError) {
    if (error.issues.length === 1) {
        return error.issues[0]?.message ?? "Validation failed";
    }
    return "Validation failed";
}

export async function fastifyErrorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {

    console.log(error);
    // Handle Zod validation errors
    if (error instanceof ZodError) {
        return reply.status(400).send(
            createApiErrorResponse({
                statusCode: 400,
                errorCode: CustomErrorCode.VALIDATION_ERROR,
                message: getPrimaryZodMessage(error),
                retryable: true,
                fault: ErrorFaultType.CLIENT,
                reason: formatZodError(error)
            })
        );
    }

    // Handle your custom errors
    if (error instanceof CustomError) {
        return reply.status(error.statusCode).send(
            createApiErrorResponse({
                statusCode: error.statusCode,
                errorCode: error.errorCode,
                message: error.message,
                fault: error.fault,
            })
        );
    }

    const response = createApiErrorResponse({
        statusCode: 500,
        errorCode: CustomErrorCode.INTERNAL_ERROR,
        message: "Internal server error, Try again later. If error persists, contact support.",
        fault: ErrorFaultType.SERVER,
        reason: process.env.NODE_ENV !== "production" ? error : undefined
    });

    return reply.status(500).send(response);
}
