import { FastifyRequest, FastifyReply } from "fastify";
import UserService from "../services/user.service";
import AuthService from "../services/auth.service";
import { sendResponse } from "../helpers";

class UserController {
    static initialize() {
        new UserController();
    }

    // GET current user profile
    public static async getProfile(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Try to get user ID from middleware OR from header
            const userId = (request as any).user?.id || (request.headers as any)['x-user-id'];
            
            if (!userId) {
                return reply.status(401).send({
                    success: false,
                    message: "User not authenticated",
                    error: "UNAUTHORIZED"
                });
            }
            
            const response = await UserService.getUserById(userId);
            return sendResponse(reply, response);
        } catch (error: any) {
            console.error('Get profile error:', error);
            
            if (error.message === "User not found") {
                return reply.status(404).send({
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                });
            }
            
            return reply.status(500).send({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    // UPDATE user profile
    public static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = (request as any).user?.id || (request.headers as any)['x-user-id'];
            
            if (!userId) {
                return reply.status(401).send({
                    success: false,
                    message: "User not authenticated",
                    error: "UNAUTHORIZED"
                });
            }
            
            const updateData = request.body as {
                firstName?: string;
                lastName?: string;
                phone?: string;
                profilePicture?: string;
                bio?: string;
            };
            
            const response = await UserService.updateUserProfile(userId, updateData);
            return sendResponse(reply, response);
        } catch (error: any) {
            console.error('Update profile error:', error);
            
            if (error.message === "User not found") {
                return reply.status(404).send({
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                });
            }
            
            return reply.status(500).send({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    // Change password
    public static async changePassword(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = (request as any).user?.id || (request.headers as any)['x-user-id'];
            
            if (!userId) {
                return reply.status(401).send({
                    success: false,
                    message: "User not authenticated",
                    error: "UNAUTHORIZED"
                });
            }
            
            const { currentPassword, newPassword } = request.body as {
                currentPassword: string;
                newPassword: string;
            };
            
            const response = await AuthService.changePassword(userId, {
                currentPassword,
                newPassword,
                deviceId: request.headers['x-device-id'] as string
            });
            
            return sendResponse(reply, response);
        } catch (error: any) {
            console.error('Change password error:', error);
            return reply.status(500).send({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }

    // GET user by ID
    public static async getProfileById(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            
            if (!id) {
                return reply.status(400).send({
                    success: false,
                    message: "User ID is required",
                    error: "MISSING_ID"
                });
            }
            
            const response = await UserService.getUserById(id);
            return sendResponse(reply, response);
        } catch (error: any) {
            console.error('Get profile by ID error:', error);
            
            if (error.message === "User not found") {
                return reply.status(404).send({
                    success: false,
                    message: "User not found",
                    error: "NOT_FOUND"
                });
            }
            
            return reply.status(500).send({
                success: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}

export const UserCtrl = UserController;
export { UserCtrl as UserController };