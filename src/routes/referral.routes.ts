import { FastifyInstance } from "fastify";
import { ReferralCtrl } from "../controllers/referral.controller.js";

export async function ReferralRouter(app: FastifyInstance) {
    app.get("/v1/referrals/validate", ReferralCtrl.validateIncomingCode);
    app.get("/v1/referrals/code", ReferralCtrl.getMyCode);
}