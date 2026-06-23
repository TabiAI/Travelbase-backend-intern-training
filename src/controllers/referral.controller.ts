import { FastifyReply, FastifyRequest } from "fastify";
import { ReferralService } from "../services/referral.service.js";

export class ReferralController {
  private readonly referralService = new ReferralService();

  getMyCode = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id; 
      
      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "You must be logged in to view your referral code.",
            retryable: false
          }
        });
      }

      const code = await this.referralService.getOrCreateReferralCode(userId);
      
      return reply.status(200).send({
        success: true,
        data: { referralCode: code }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while retrieving your code.",
          retryable: true
        }
      });
    }
  }

  validateIncomingCode = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.query as { code?: string };

      if (!code) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The referral code query parameter is required.",
            details: { code: "Query parameter '?code=' cannot be empty." },
            retryable: false
          }
        });
      }

      const result = await this.referralService.validateCode(code);

      if (!result.isValid) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: "The provided referral code does not exist.",
            retryable: false
          }
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          isValid: true,
          company: result.referrer?.company || "Travelbase Member"
        }
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while validating the code.",
          retryable: true
        }
      });
    }
  }
}