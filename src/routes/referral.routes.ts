import { FastifyInstance } from "fastify";
import { ReferralController } from "../controllers/referral.controller";

const controller = new ReferralController();

export async function ReferralRouter(app: FastifyInstance) {
  
  app.get("/v1/referrals/validate", controller.validateIncomingCode);


  app.get("/v1/referrals/code", controller.getMyCode);
}