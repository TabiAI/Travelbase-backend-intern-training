import { FastifyRequest, FastifyReply } from "fastify";
import UserService from "../services/user.service";
import { sendResponse } from "../helpers";
//import { BadRequestError, CustomErrorCode, UnAuthorizedError } from "../exceptions";
//import {sendResponse} from "../helpers";
import {ChangePasswordRequest} from "../schemas";

UserService.initialize();

class UserController {
    static initialize() {
        new UserController();
    }

    // GET current user profile
    public static async getProfile(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Get user ID from middleware OR header
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
            // Get user ID from middleware OR header
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

    // CHANGE user password
    public static async changePassword(request: FastifyRequest, reply: FastifyReply) {
        const {currentPassword, newPassword} = ChangePasswordRequest.parse(request.body ?? {});
        const result = await UserService.changePassword(request.user!.id, {
            currentPassword,
            newPassword,
            deviceId: <string>request.headers['x-device-id'],
        });
        return sendResponse(reply, result);
    }
}

export const UserCtrl = UserController;
export { UserCtrl as UserController };
