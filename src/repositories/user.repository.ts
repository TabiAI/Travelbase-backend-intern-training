import { prisma } from "../lib/db";
import userRepository from "../repositories/user.repository";

export class UserRepository {
    async findById(userId: string) {
        return await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    async updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
    }) {
        return await prisma.users.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}

export default new UserRepository();