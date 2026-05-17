import {FastifyReply, FastifyRequest} from "fastify";
import {CustomErrorCode, ForbiddenError, UnAuthorizedError} from "../exceptions";
import {prisma} from "../lib/db";
import {TOKEN_TYPE, verifyToken} from "../helpers";
//import {redisClient} from "../lib";

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
    
    console.log("=== DEBUG AUTH ===");
    console.log("x-auth-token:", authToken);
    console.log("x-device-id:", deviceId);
    
    if (!authToken || typeof authToken !== "string") {
        console.log("ERROR: Missing auth token");
        throw new UnAuthorizedError({msg: "Missing auth token", errorCode: CustomErrorCode.AUTH_INVALID})
    }

    if (!deviceId || typeof deviceId !== "string") {
        console.log("ERROR: Missing device id");
        throw new UnAuthorizedError({msg: "Missing device id", errorCode: CustomErrorCode.AUTH_INVALID})
    }

    try {
        // Check database for the token
        console.log("Searching for token in database...");
        const dbToken = await prisma.userTokens.findFirst({
            where: { 
                accessToken: authToken,  // Make sure this matches your schema
                deviceId: deviceId 
            }
        });
        
        console.log("Database result:", dbToken ? "FOUND" : "NOT FOUND");
        
        if (!dbToken) {
            throw new ForbiddenError({
                msg: 'Invalid token',
                errorCode: CustomErrorCode.AUTH_INVALID
            });
        }
        
        const decodedJwtData = verifyToken(authToken);
        console.log("Decoded token:", decodedJwtData);

        if (!decodedJwtData || decodedJwtData.tokenType !== TOKEN_TYPE.AUTH_TOKEN) {
            console.log("ERROR: Invalid token type or decode failed");
            throw new UnAuthorizedError({msg: "Invalid auth token", errorCode: CustomErrorCode.AUTH_INVALID})
        }

        const user = await prisma.users.findUnique({where: {id: decodedJwtData.userId},});

        if (!user) {
            console.log("ERROR: User not found");
            throw new UnAuthorizedError({msg: "Invalid auth Token ", errorCode: CustomErrorCode.AUTH_INVALID})
        }

        request.user = {
            id: decodedJwtData.userId,
            email: decodedJwtData.email,
        }
        
        console.log("AUTH SUCCESS for user:", user.email);
        return true;
    } catch (error: unknown) {
        console.log("AUTH ERROR:", error);
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