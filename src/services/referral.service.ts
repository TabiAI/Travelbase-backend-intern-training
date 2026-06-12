import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes } from "crypto"; // Built into Node.js (No installation required!)

const prisma = new PrismaClient();

export class ReferralService {
  /**
   * Generates a unique referral code string using native crypto.
   */
  private static generateCode(companyName?: string): string {
    const prefix = companyName 
      ? companyName.replace(/\s+/g, "").substring(0, 3).toUpperCase() 
      : "TB";
    
    // Generate a 6-character random alphanumeric string
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomString = "";
    const bytes = randomBytes(6);
    
    for (let i = 0; i < 6; i++) {
      randomString += chars[bytes[i] % chars.length];
    }

    return `${prefix}-${randomString}`;
  }

  /**
   * Retrieves an existing referral code for a user, or generates a new one.
   */
  async getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { referralCode: true, company: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
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

  /**
   * Validates if a referral code exists in the system.
   */
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

  /**
   * Process the referral credit during user signup inside a Prisma Transaction.
   */
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
      throw new Error("INVALID_REFERRAL_CODE");
    }

    if (referrer.id === refereeId) {
      throw new Error("SELF_REFERRAL_FORBIDDEN");
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

  /**
   * Helper utility to generate a code string during standard signups.
   */
  generateInitialCode(companyName?: string): string {
    return ReferralService.generateCode(companyName);
  }
}