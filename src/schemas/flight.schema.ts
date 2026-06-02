import {z} from "zod";

export const SearchFlightsRequest = z.object({
    origin: z.string().length(3).transform((v) => v.toUpperCase()),
    destination: z.string().length(3).transform((v) => v.toUpperCase()),
    departureDate: z.string().date(),
    passengers: z.coerce.number().int().min(1).max(9).optional().default(1),
});

const PassengerSchema = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(20),
    passportNumber: z.string().min(5).max(20),
    nationality: z.string().length(2).transform((v) => v.toUpperCase()),
    dateOfBirth: z.string().date(),
    type: z.enum(["ADULT", "CHILD", "INFANT"]).default("ADULT"),
    seatNumber: z.string().min(1).max(10).optional(),
    seatClass: z.enum(["ECONOMY", "BUSINESS", "FIRST"]).optional(),
});

export const CreateBookingRequest = z.object({
    flightId: z.string().uuid(),
    passengers: z.array(PassengerSchema).min(1).max(9),
});

export const InitiatePaymentRequest = z.object({
    paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "WALLET"]),
});

export const ConfirmPaymentRequest = z.object({
    status: z.enum(["SUCCESSFUL", "FAILED"]),
});

export const FlightIdParamSchema = z.object({
    flightId: z.string().uuid(),
});

export const BookingIdParamSchema = z.object({
    bookingId: z.string().uuid(),
});

export const PaymentIdParamSchema = z.object({
    bookingId: z.string().uuid(),
    paymentId: z.string().uuid(),
});
