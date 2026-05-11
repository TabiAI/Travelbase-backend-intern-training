import { FastifyRequest, FastifyReply } from "fastify";
import userService from "../services/user.service";
import { UnAuthorizedError, BadRequestError, CustomErrorCode } from "../exceptions";

export class UserController {
    
    // Get current user's profile
    static getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = (request.headers as Record<string, string>)['x-user-id'];
        
        if (!userId) {
            throw new UnAuthorizedError({
                msg: "User ID not found in request",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        
        const result = await userService.getProfile(userId);
        
        return reply.status(200).send({
            success: true,
            message: "Profile retrieved successfully",
            data: result.data
        });
    }

    // Update current user's profile
    static updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = (request.headers as Record<string, string>)['x-user-id'];
        
        if (!userId) {
            throw new UnAuthorizedError({
                msg: "User ID not found in request",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        
        const updateData = request.body as {
            firstName?: string;
            lastName?: string;
            phone?: string;
            profilePicture?: string;
            bio?: string;
        };
        
        const result = await userService.updateProfile(userId, updateData);
        
        return reply.status(200).send({
            success: true,
            message: "Profile updated successfully",
            data: result.data
        });
    }

    // Get profile by ID (admin access)
    static getProfileById = async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        
        if (!id) {
            throw new BadRequestError({
                msg: "User ID is required",
                errorCode: CustomErrorCode.INVALID_INPUT
            });
        }
        
        const result = await userService.getProfile(id);
        
        return reply.status(200).send({
            success: true,
            message: "Profile retrieved successfully",
            data: result.data
        });
    }
}

export default UserController;