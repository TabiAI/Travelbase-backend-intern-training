import { prisma } from "../lib/db";

export class UserRepository {
    
    async findById(userId: string) {
        return await prisma.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePicture: true,
                bio: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    async updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        profilePicture?: string;
        bio?: string;
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
                phone: true,
                profilePicture: true,
                bio: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}

export default new UserRepository();