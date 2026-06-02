import {FastifyReply, FastifyRequest} from "fastify";
import FlightService from "../services/flight.service";
import {sendResponse} from "../helpers";
import {
    BookingIdParamSchema,
    ConfirmPaymentRequest,
    CreateBookingRequest,
    FlightIdParamSchema,
    InitiatePaymentRequest,
    PaymentIdParamSchema,
    SearchFlightsRequest,
} from "../schemas";

FlightService.initialize();

class FlightController {
    static initialize() {
        new FlightController();
    }

    public static async searchFlights(request: FastifyRequest, reply: FastifyReply) {
        const query = SearchFlightsRequest.parse(request.query ?? {});
        const result = await FlightService.searchFlights(query);
        return sendResponse(reply, result);
    }

    public static async getFlightById(request: FastifyRequest, reply: FastifyReply) {
        const {flightId} = FlightIdParamSchema.parse(request.params);
        const result = await FlightService.getFlightById(flightId);
        return sendResponse(reply, result);
    }

    public static async createBooking(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const body = CreateBookingRequest.parse(request.body ?? {});
        const result = await FlightService.createBooking(userId, body);
        return sendResponse(reply, result, 201);
    }

    public static async getBookings(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const query = request.query as {page?: string; limit?: string};
        const page = Math.max(1, parseInt(query.page ?? "1"));
        const limit = Math.min(20, Math.max(1, parseInt(query.limit ?? "10")));
        const result = await FlightService.getBookings(userId, page, limit);
        return sendResponse(reply, result);
    }

    public static async getBookingById(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const {bookingId} = BookingIdParamSchema.parse(request.params);
        const result = await FlightService.getBookingById(userId, bookingId);
        return sendResponse(reply, result);
    }

    public static async cancelBooking(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const {bookingId} = BookingIdParamSchema.parse(request.params);
        const result = await FlightService.cancelBooking(userId, bookingId);
        return sendResponse(reply, result);
    }

    public static async initiatePayment(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const {bookingId} = BookingIdParamSchema.parse(request.params);
        const {paymentMethod} = InitiatePaymentRequest.parse(request.body ?? {});
        const result = await FlightService.initiatePayment(userId, {bookingId, paymentMethod});
        return sendResponse(reply, result, 201);
    }

    public static async confirmPayment(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.id;
        const {bookingId, paymentId} = PaymentIdParamSchema.parse(request.params);
        const body = ConfirmPaymentRequest.parse(request.body ?? {});
        const result = await FlightService.confirmPayment(userId, bookingId, paymentId, body);
        return sendResponse(reply, result);
    }
}

export const FlightCtrl = FlightController;
