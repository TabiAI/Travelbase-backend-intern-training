import { prisma } from "../lib/db";

export class UserRepository {
    static async findById(id: string) {
        return prisma.users.findUnique({where: {id}});
    }

    static async findByEmail(email: string) {
        return prisma.users.findUnique({where: {email}});
    }

    static async findAuthByUserId(userId: string) {
        return prisma.userAuths.findUnique({where: {userId}});
    }

    static async updatePasswordHash(userId: string, passwordHash: string) {
        return prisma.userAuths.update({
            where: {userId},
            data: {passwordHash},
        });
    }
    
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




export default UserRepository;
