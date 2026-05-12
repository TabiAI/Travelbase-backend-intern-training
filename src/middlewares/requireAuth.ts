import {FastifyReply, FastifyRequest} from "fastify";
import {CustomErrorCode, ForbiddenError, UnAuthorizedError} from "../exceptions";
import {prisma} from "../lib/db";
import {TOKEN_TYPE, verifyToken} from "../helpers";
import {redisClient} from "../lib";

export async function requireAuthHook(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const url = request.raw.url ?? request.url;
    if (isPublicRoute(url)) return;
    return authenticateBearer(request, reply);
}

function isPublicRoute(url: string) {
    return (
        url.startsWith("/health") ||
        url.startsWith("/v1/admin") ||
        url.startsWith("/v1/auth") ||
        url.startsWith("/v1/webhooks/air") ||
        !url.startsWith("/v1")
    );
}

async function authenticateBearer(request: FastifyRequest, reply: FastifyReply) {
    const authToken = request.headers["x-auth-token"];
    const deviceId = request.headers["x-device-id"];
    if (!authToken || typeof authToken !== "string") {
        throw new UnAuthorizedError({msg: "Missing auth token", errorCode: CustomErrorCode.AUTH_INVALID})
    }

    if (!deviceId || typeof deviceId !== "string") {
        throw new UnAuthorizedError({msg: "Missing device id", errorCode: CustomErrorCode.AUTH_INVALID})
    }

    try {

        const cacheKey = `travelBase_token:${authToken}:${deviceId}`;
        const cachedToken = await redisClient.get(cacheKey);
        if (!cachedToken) {
            const dbToken = await prisma.userTokens.findFirst({
                where: {accessToken: authToken, deviceId}
            })
            if (!dbToken) {
                throw new ForbiddenError({
                    msg: 'Invalid token',
                    errorCode: CustomErrorCode.AUTH_INVALID
                });
            } else {
                await redisClient.set(cacheKey, JSON.stringify(dbToken.accessToken));
                await redisClient.expire(cacheKey, 60 * 60 * 24 * 7); // 7 days
            }
        }
        const decodedJwtData = verifyToken(authToken);

        if (!decodedJwtData || decodedJwtData.tokenType !== TOKEN_TYPE.AUTH_TOKEN) {
            throw new UnAuthorizedError({msg: "Invalid auth token", errorCode: CustomErrorCode.AUTH_INVALID})
        }

        const user = await prisma.users.findUnique({where: {id: decodedJwtData.userId},});

        if (!user) {
            throw new UnAuthorizedError({msg: "Invalid auth Token ", errorCode: CustomErrorCode.AUTH_INVALID})
        }

        request.user = {
            id: decodedJwtData.userId,
            email: decodedJwtData.email,
        }

        return true;
    } catch (error: unknown) {
        console.log(error);
        throw new UnAuthorizedError({msg: "Invalid auth token", errorCode: CustomErrorCode.AUTH_INVALID})
    }
}

export async function requireDeviceHook(requrest: FastifyRequest, reply: FastifyReply) {
    const deviceId = requrest.headers["x-device-id"];
    if (!deviceId || typeof deviceId !== "string") {
        throw new UnAuthorizedError({msg: "Missing device id", errorCode: CustomErrorCode.AUTH_INVALID})
    }
    return true;
}