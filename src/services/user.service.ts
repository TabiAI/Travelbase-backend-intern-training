import { IService } from "../interfaces";
import userRepository from "../repositories/user.repository";
import { NotFoundError, CustomErrorCode } from "../exceptions";

export class UserService {
    
    async getProfile(userId: string): Promise<IService> {
        const user = await userRepository.findById(userId);
        
        if (!user) {
            throw new NotFoundError({
                msg: "User not found",
                errorCode: CustomErrorCode.RESOURCE_NOT_FOUND
            });
        }
        
        return {
            success: true,
            message: "Profile retrieved successfully",
            data: user
        };
    }

    async updateProfile(userId: string, updateData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        profilePicture?: string;
        bio?: string;
    }): Promise<IService> {
        const user = await userRepository.findById(userId);
        
        if (!user) {
            throw new NotFoundError({
                msg: "User not found",
                errorCode: CustomErrorCode.RESOURCE_NOT_FOUND
            });
        }
        
        const updatedUser = await userRepository.updateProfile(userId, updateData);
        
        return {
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        };
    }
}

export default new UserService();