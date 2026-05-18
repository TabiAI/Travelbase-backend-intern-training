import {prisma} from '../lib/db';

class UserRepository {

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

}

export default UserRepository;
