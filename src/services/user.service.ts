import { IService } from "../interfaces";
import userRepository from "../repositories/user.repository";

export class UserService {
    async getProfile(userId: string): Promise<IService> {
        const user = await userRepository.findById(userId);
        
        if (!user) {
            // ✅ Return error as regular response, not throw
            return {
                success: false,
                message: "User not found",
                error: "NOT_FOUND"
            };
        }
        
        return {
            success: true,
            message: "Profile retrieved successfully",
            data: user
        };
    }

    async updateProfile(userId: string, updateData: any): Promise<IService> {
        const user = await userRepository.findById(userId);
        
        if (!user) {
            return {
                success: false,
                message: "User not found",
                error: "NOT_FOUND"
            };
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