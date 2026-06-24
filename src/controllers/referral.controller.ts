import {FastifyReply, FastifyRequest} from "fastify";
import {ReferralService} from "../services/referral.service.js";
import {sendResponse} from "../helpers";

class ReferralController {
    private static readonly referralService = new ReferralService();

    static initialize() {
        new ReferralController();
    }

    public static async getMyCode(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const code = await ReferralController.referralService.getOrCreateReferralCode(userId);
        return sendResponse(reply, {
            success: true,
            message: "Referral code retrieved successfully",
            data: { referralCode: code }
        } as any);
    }

    public static async validateIncomingCode(request: FastifyRequest, reply: FastifyReply) {
        const {code} = request.query as {code: string};
        const result = await ReferralController.referralService.validateCode(code);
        return sendResponse(reply, {
            success: result.isValid,
            message: result.isValid ? "Referral code validated successfully" : "Invalid referral code",
            data: {
                isValid: result.isValid,
                company: result.referrer?.company || "Travelbase Member"
            }
        } as any);
    }
}

export const ReferralCtrl = ReferralController;