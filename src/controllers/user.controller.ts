import { FastifyRequest, FastifyReply } from "fastify";
import userService from "../services/user.service";
import { sendResponse } from "../helpers";

export class UserController {
    
    static async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        try {
            const userId = (request.headers as Record<string, string>)['x-user-id'];
            
            if (!userId) {
                return sendResponse(reply, {
                    success: false,
                    message: "User ID not found in request",
                    error: "UNAUTHORIZED"
                } as any, 401);
            }
            
            const result = await userService.getProfile(userId);
            return sendResponse(reply, result, 200);
        } catch (error: any) {
            console.error('Get profile error:', error);
            
            // ✅ Check for different error properties
            const errorCode = error?.errorCode || error?.code;
            const errorMessage = error?.msg || error?.message;
            
            if (errorCode === "NOT_FOUND" || errorMessage === "User not found") {
                return sendResponse(reply, {
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                } as any, 404);
            }
            
            return sendResponse(reply, {
                success: false,
                message: "Internal server error",
                error: errorMessage || "UNKNOWN_ERROR"
            } as any, 500);
        }
    }

    static async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<any> {
        try {
            const userId = (request.headers as Record<string, string>)['x-user-id'];
            const updateData = request.body as {
                firstName?: string;
                lastName?: string;
                phone?: string;
                profilePicture?: string;
                bio?: string;
            };
            
            if (!userId) {
                return sendResponse(reply, {
                    success: false,
                    message: "User ID not found in request",
                    error: "UNAUTHORIZED"
                } as any, 401);
            }
            
            const result = await userService.updateProfile(userId, updateData);
            return sendResponse(reply, result, 200);
        } catch (error: any) {
            console.error('Update profile error:', error);
            
            const errorCode = error?.errorCode || error?.code;
            const errorMessage = error?.msg || error?.message;
            
            if (errorCode === "NOT_FOUND" || errorMessage === "User not found") {
                return sendResponse(reply, {
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                } as any, 404);
            }
            
            return sendResponse(reply, {
                success: false,
                message: "Internal server error",
                error: errorMessage || "UNKNOWN_ERROR"
            } as any, 500);
        }
    }

    static async getProfileById(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            
            if (!id) {
                return sendResponse(reply, {
                    success: false,
                    message: "User ID is required",
                    error: "MISSING_ID"
                } as any, 400);
            }
            
            const result = await userService.getProfile(id);
            return sendResponse(reply, result, 200);
        } catch (error: any) {
            console.error('Get profile by ID error:', error);
            
            const errorCode = error?.errorCode || error?.code;
            const errorMessage = error?.msg || error?.message;
            
            if (errorCode === "NOT_FOUND" || errorMessage === "User not found") {
                return sendResponse(reply, {
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                } as any, 404);
            }
            
            return sendResponse(reply, {
                success: false,
                message: "Internal server error",
                error: errorMessage || "UNKNOWN_ERROR"
            } as any, 500);
        }
    }
}

export default UserController;