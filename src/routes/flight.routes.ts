import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {FlightCtrl} from "../controllers";
import {requireAuthHook} from "../middlewares";

FlightCtrl.initialize();

export async function FlightRouter(app: FastifyInstance) {
    app.get("/v1/flights/search", async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.searchFlights(req, reply)
    );

    app.get("/v1/flights/:flightId", async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.getFlightById(req, reply)
    );

    app.post("/v1/flights/bookings", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.createBooking(req, reply)
    );

    app.get("/v1/flights/bookings", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.getBookings(req, reply)
    );

    app.get("/v1/flights/bookings/:bookingId", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.getBookingById(req, reply)
    );

    app.delete("/v1/flights/bookings/:bookingId", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.cancelBooking(req, reply)
    );

    app.post("/v1/flights/bookings/:bookingId/payments", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.initiatePayment(req, reply)
    );

    app.patch("/v1/flights/bookings/:bookingId/payments/:paymentId", {preHandler: requireAuthHook}, async (req: FastifyRequest, reply: FastifyReply) =>
        FlightCtrl.confirmPayment(req, reply)
    );
}
