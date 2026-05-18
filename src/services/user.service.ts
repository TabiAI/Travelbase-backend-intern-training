import {prisma} from "../lib/db";
import {IService} from "../interfaces";
import {BadRequestError, CustomErrorCode, ForbiddenError, NotFoundError, UnAuthorizedError} from "../exceptions";
import {hashPassword, verifyPassword} from "../helpers";
import UserRepository from "../repositories/user.repository";
import {ChangePasswordDTO} from "../interfaces";
import {redisClient} from "../lib";

const MAX_PWD_ATTEMPTS = 3;
const PWD_ATTEMPT_TTL = 15 * 60; // 15 minutes
const pwdAttemptKey = (userId: string) => `travelBase_pwd_change_attempts:${userId}`;

class UserService {
    static initialize() {
        new UserService();
    }

    public static async getUserById(userId: string): Promise<IService> {
        const user = await prisma.users.findFirst({
            where: {id: userId}
        });

        if (!user) {
            throw new NotFoundError({msg: "User not found", errorCode: CustomErrorCode.RESOURCE_NOT_FOUND})
        }

        return {
            success: true,
            message: "User profile retrieved successfully",
            data: {user}
        }
    }

    public static async changePassword(userId: string, input: ChangePasswordDTO): Promise<IService> {
        const {currentPassword, newPassword} = input;

        const userAuth = await UserRepository.findAuthByUserId(userId);
        if (!userAuth) {
            throw new NotFoundError({msg: "User not found", errorCode: CustomErrorCode.RESOURCE_NOT_FOUND});
        }

        const attemptsRaw = await redisClient.get(pwdAttemptKey(userId));
        const attempts = attemptsRaw ? parseInt(attemptsRaw) : 0;

        if (attempts >= MAX_PWD_ATTEMPTS) {
            throw new ForbiddenError({msg: "Too many failed attempts. Please try again later.", errorCode: CustomErrorCode.TOO_MANY_ATTEMPTS});
        }

        const isMatch = await verifyPassword(currentPassword, userAuth.passwordHash);
        if (!isMatch) {
            await redisClient.set(pwdAttemptKey(userId), (attempts + 1).toString());
            await redisClient.expire(pwdAttemptKey(userId), PWD_ATTEMPT_TTL);
            throw new UnAuthorizedError({msg: "Current password is incorrect", errorCode: CustomErrorCode.AUTH_INVALID});
        }

        const isSamePassword = await verifyPassword(newPassword, userAuth.passwordHash);
        if (isSamePassword) {
            await redisClient.set(pwdAttemptKey(userId), (attempts + 1).toString());
            await redisClient.expire(pwdAttemptKey(userId), PWD_ATTEMPT_TTL);
            throw new BadRequestError({msg: "New password must be different from current password", errorCode: CustomErrorCode.BAD_REQUEST});
        }

        await redisClient.del(pwdAttemptKey(userId));
        const newPasswordHash = await hashPassword(newPassword);
        await UserRepository.updatePasswordHash(userId, newPasswordHash);

        return {
            success: true,
            message: "Password changed successfully",
        };
    }
}

export default UserService;
