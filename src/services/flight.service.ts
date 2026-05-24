import {createHash, randomBytes} from "crypto";
import {Prisma} from "@prisma/client";
import {IService} from "../interfaces";
import {BadRequestError, CustomErrorCode, ForbiddenError, NotFoundError} from "../exceptions";
import {FlightRepository} from "../repositories";
import {redisClient} from "../lib";
import {ConfirmPaymentDTO, CreateBookingDTO, InitiatePaymentDTO, SearchFlightsDTO} from "../interfaces";

const SEARCH_CACHE_TTL = 300;

const searchCacheKey = (params: SearchFlightsDTO): string =>
    `travelBase_flight_search:${createHash("md5").update(JSON.stringify(params)).digest("hex")}`;

class FlightService {
    static initialize() {
        new FlightService();
    }

    public static async searchFlights(input: SearchFlightsDTO): Promise<IService> {
        const cacheKey = searchCacheKey(input);
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const flights = JSON.parse(cached);
            return {success: true, message: "Flights retrieved", data: {flights}, meta: {count: flights.length}};
        }

        const flights = await FlightRepository.findFlights(input.origin, input.destination, input.departureDate);

        await redisClient.set(cacheKey, JSON.stringify(flights));
        await redisClient.expire(cacheKey, SEARCH_CACHE_TTL);

        return {
            success: true,
            message: "Flights retrieved",
            data: {flights},
            meta: {count: flights.length},
        };
    }

    public static async getFlightById(flightId: string): Promise<IService> {
        const flight = await FlightRepository.findFlightById(flightId);
        if (!flight) {
            throw new NotFoundError({msg: "Flight not found", errorCode: CustomErrorCode.FLIGHT_NOT_FOUND});
        }
        return {success: true, message: "Flight retrieved", data: {flight}};
    }

    public static async createBooking(userId: string, input: CreateBookingDTO): Promise<IService> {
        const flight = await FlightRepository.findFlightById(input.flightId);
        if (!flight) {
            throw new NotFoundError({msg: "Flight not found", errorCode: CustomErrorCode.FLIGHT_NOT_FOUND});
        }

        if (flight.status !== "SCHEDULED") {
            throw new BadRequestError({
                msg: "Flight is not available for booking",
                errorCode: CustomErrorCode.FLIGHT_UNAVAILABLE,
            });
        }

        if (flight.availableSeats < input.passengers.length) {
            throw new BadRequestError({
                msg: "Not enough available seats on this flight",
                errorCode: CustomErrorCode.FLIGHT_UNAVAILABLE,
            });
        }

        const requestedSeats = input.passengers.filter((p) => p.seatNumber).map((p) => p.seatNumber!);
        if (requestedSeats.length > 0) {
            const takenSeats = flight.Seats.filter((s) => s.bookingId && requestedSeats.includes(s.seatNumber));
            if (takenSeats.length > 0) {
                throw new BadRequestError({
                    msg: `Seats already taken: ${takenSeats.map((s) => s.seatNumber).join(", ")}`,
                    errorCode: CustomErrorCode.SEAT_ALREADY_TAKEN,
                });
            }
        }

        const totalAmount = new Prisma.Decimal(flight.price).mul(input.passengers.length);
        const passengers = input.passengers.map((p) => ({...p, dateOfBirth: new Date(p.dateOfBirth)}));

        try {
            const {booking} = await FlightRepository.createBookingWithPassengers(
                userId,
                input.flightId,
                totalAmount,
                flight.currency,
                passengers
            );

            return {
                success: true,
                message: "Booking created successfully",
                data: {
                    bookingId: booking.id,
                    status: booking.status,
                    totalAmount: totalAmount.toString(),
                    currency: flight.currency,
                },
            };
        } catch (error: any) {
            if (error?.code === "P2002") {
                throw new BadRequestError({
                    msg: "One or more requested seats are already taken",
                    errorCode: CustomErrorCode.SEAT_ALREADY_TAKEN,
                });
            }
            throw error;
        }
    }

    public static async getBookings(userId: string, page: number, limit: number): Promise<IService> {
        const skip = (page - 1) * limit;
        const {bookings, total} = await FlightRepository.findBookingsByUserId(userId, skip, limit);

        return {
            success: true,
            message: "Bookings retrieved",
            data: {bookings},
            meta: {total, page, limit, totalPages: Math.ceil(total / limit)},
        };
    }

    public static async getBookingById(userId: string, bookingId: string): Promise<IService> {
        const booking = await FlightRepository.findBookingById(bookingId);
        if (!booking) {
            throw new NotFoundError({msg: "Booking not found", errorCode: CustomErrorCode.BOOKING_NOT_FOUND});
        }
        if (booking.userId !== userId) {
            throw new ForbiddenError({msg: "Access denied", errorCode: CustomErrorCode.ACCESS_DENIED});
        }
        return {success: true, message: "Booking retrieved", data: {booking}};
    }

    public static async cancelBooking(userId: string, bookingId: string): Promise<IService> {
        const booking = await FlightRepository.findBookingById(bookingId);
        if (!booking) {
            throw new NotFoundError({msg: "Booking not found", errorCode: CustomErrorCode.BOOKING_NOT_FOUND});
        }
        if (booking.userId !== userId) {
            throw new ForbiddenError({msg: "Access denied", errorCode: CustomErrorCode.ACCESS_DENIED});
        }
        if (booking.status === "CANCELLED") {
            throw new BadRequestError({
                msg: "Booking is already cancelled",
                errorCode: CustomErrorCode.BOOKING_ALREADY_CANCELLED,
            });
        }
        if (booking.status === "COMPLETED") {
            throw new BadRequestError({
                msg: "Completed bookings cannot be cancelled",
                errorCode: CustomErrorCode.RESOURCE_STATE_INVALID,
            });
        }

        await FlightRepository.updateBookingStatus(bookingId, "CANCELLED");
        return {success: true, message: "Booking cancelled successfully"};
    }

    public static async initiatePayment(userId: string, input: InitiatePaymentDTO): Promise<IService> {
        const booking = await FlightRepository.findBookingById(input.bookingId);
        if (!booking) {
            throw new NotFoundError({msg: "Booking not found", errorCode: CustomErrorCode.BOOKING_NOT_FOUND});
        }
        if (booking.userId !== userId) {
            throw new ForbiddenError({msg: "Access denied", errorCode: CustomErrorCode.ACCESS_DENIED});
        }
        if (booking.status !== "PENDING") {
            throw new BadRequestError({
                msg: "Only pending bookings can be paid",
                errorCode: CustomErrorCode.RESOURCE_STATE_INVALID,
            });
        }

        const transactionRef = `TB-PAY-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;

        const payment = await FlightRepository.createPayment({
            bookingId: booking.id,
            userId,
            amount: booking.totalAmount,
            currency: booking.currency,
            paymentMethod: input.paymentMethod,
            transactionRef,
        });

        return {
            success: true,
            message: "Payment initiated",
            data: {
                paymentId: payment.id,
                transactionRef,
                amount: booking.totalAmount.toString(),
                currency: booking.currency,
            },
        };
    }

    public static async confirmPayment(
        userId: string,
        bookingId: string,
        paymentId: string,
        input: ConfirmPaymentDTO
    ): Promise<IService> {
        const payment = await FlightRepository.findPaymentById(paymentId);
        if (!payment || payment.bookingId !== bookingId) {
            throw new NotFoundError({msg: "Payment not found", errorCode: CustomErrorCode.PAYMENT_NOT_FOUND});
        }
        if (payment.userId !== userId) {
            throw new ForbiddenError({msg: "Access denied", errorCode: CustomErrorCode.ACCESS_DENIED});
        }
        if (payment.status !== "PENDING") {
            throw new BadRequestError({
                msg: "Payment has already been processed",
                errorCode: CustomErrorCode.RESOURCE_STATE_INVALID,
            });
        }

        await FlightRepository.updatePaymentStatus(paymentId, input.status);

        if (input.status === "SUCCESSFUL") {
            await FlightRepository.updateBookingStatus(payment.bookingId, "CONFIRMED");
        }

        return {success: true, message: `Payment ${input.status.toLowerCase()}`};
    }
}

export default FlightService;
