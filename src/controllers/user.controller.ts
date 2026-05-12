import {FastifyReply, FastifyRequest} from "fastify";
import UserService from "../services/user.service";
import {sendResponse} from "../helpers";
import {BadRequestError, CustomErrorCode, UnAuthorizedError} from "../exceptions";

//UserService.initialize();

class UserController {
    static initialize() {
        new UserController();
    }

    // GET current user profile - Using middleware
    public static async getProfile(request: FastifyRequest, reply: FastifyReply) {
        const userId = (request.headers as any)['x-user-id'] || (request as any).user?.id;
        
        if (!userId) {
            throw new UnAuthorizedError({
                msg: "User not authenticated",
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        
        const response = await UserService.getUserById(userId);
        return sendResponse(reply, response);
    }

    // UPDATE user profile
    public static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
        const userId = (request as any).user?.id;
        
        if (!userId) {
            throw new UnAuthorizedError({
                msg: "User not authenticated",
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
        
        const response = await UserService.updateUserProfile(userId, updateData);
        return sendResponse(reply, response);
    }

    // GET user by ID (admin access)
    public static async getProfileById(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        
        if (!id) {
            return sendResponse(reply, {
                success: false,
                message: "User ID is required",
                error: "MISSING_ID"
            }, 400);
        }
        
        const response = await UserService.getUserById(id);
        return sendResponse(reply, response);
    }
}

export const UserCtrl = UserController;
export { UserCtrl as UserController };