import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { CustomErrorCode } from "../exceptions/error.code.js";
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from "../exceptions/operational.error.js";

const prisma = new PrismaClient();

export class ReferralService {
  private static generateCode(companyName?: string): string {
    const prefix = companyName 
      ? companyName.replace(/\s+/g, "").substring(0, 3).toUpperCase() 
      : "TB";
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomString = "";
    const bytes = randomBytes(6);
    
    for (let i = 0; i < 6; i++) {
      randomString += chars[bytes[i] % chars.length];
    }

    return `${prefix}-${randomString}`;
  }

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referralCode: true, company: true },
    });

    if (!user) {
      throw new NotFoundError({
        msg: "User not found",
        errorCode: CustomErrorCode.RESOURCE_NOT_FOUND,
      });
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    const newCode = ReferralService.generateCode(user.company ?? undefined);
    
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { referralCode: newCode },
      select: { referralCode: true },
    });

    return updatedUser.referralCode;
  }

  async validateCode(code: string) {
    const referrer = await prisma.users.findUnique({
      where: { referralCode: code.toUpperCase().trim() },
      select: { id: true, company: true },
    });

    if (!referrer) {
      return { isValid: false, referrer: null };
    }

    return { isValid: true, referrer };
  }

  async processSignupReferral(
    tx: Prisma.TransactionClient,
    refereeId: string,
    referralCode: string
  ): Promise<void> {
    const cleanCode = referralCode.toUpperCase().trim();

    const referrer = await tx.users.findUnique({
      where: { referralCode: cleanCode },
    });

    if (!referrer) {
      throw new BadRequestError({
        msg: "Invalid referral code",
        errorCode: CustomErrorCode.INVALID_INPUT,
      });
    }

    if (referrer.id === refereeId) {
      throw new ForbiddenError({
        msg: "Self-referral is forbidden",
        errorCode: CustomErrorCode.ACTION_NOT_ALLOWED,
      });
    }

    await tx.referrals.create({
      data: {
        referrerId: referrer.id,
        refereeId: refereeId,
        codeUsed: cleanCode,
        pointsGiven: 10,
      },
    });

    await tx.users.update({
      where: { id: referrer.id },
      data: {
        referralPoints: {
          increment: 10,
        },
      },
    });
  }

  generateInitialCode(companyName?: string): string {
    return ReferralService.generateCode(companyName);
  }
}