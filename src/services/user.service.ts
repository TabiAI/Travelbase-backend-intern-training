import {prisma} from "../lib/db";
import {IService} from "../interfaces";
import {CustomErrorCode, NotFoundError} from "../exceptions";

class UserService {
    static initialize() {
        new UserService();
    }

    // GET user by ID
    public static async getUserById(userId: string): Promise<IService> {
        const user = await prisma.users.findFirst({
            where: {id: userId}
        });

        if (!user) {
            throw new NotFoundError({
                msg: "User not found", 
                errorCode: CustomErrorCode.RESOURCE_NOT_FOUND
            });
        }

        return {
            success: true,
            message: "User profile retrieved successfully",
            data: {
                user
            }
        };
    }

    // UPDATE user profile - ADD THIS METHOD
    public static async updateUserProfile(userId: string, updateData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        profilePicture?: string;
        bio?: string;
    }): Promise<IService> {
        const user = await prisma.users.findFirst({
            where: {id: userId}
        });

        if (!user) {
            throw new NotFoundError({
                msg: "User not found",
                errorCode: CustomErrorCode.RESOURCE_NOT_FOUND
            });
        }

        const updatedUser = await prisma.users.update({
            where: {id: userId},
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });

        return {
            success: true,
            message: "User profile updated successfully",
            data: {
                user: updatedUser
            }
        };
    }
}

export default UserService;