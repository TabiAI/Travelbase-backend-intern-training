import {PassengerType, PaymentMethod, SeatClass} from "@prisma/client";

export interface SearchFlightsDTO {
    origin: string;
    destination: string;
    departureDate: string;
    passengers: number;
}

export interface PassengerInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;
    type: PassengerType;
    seatNumber?: string;
    seatClass?: SeatClass;
}

export interface CreateBookingDTO {
    flightId: string;
    passengers: PassengerInput[];
}

export interface InitiatePaymentDTO {
    bookingId: string;
    paymentMethod: PaymentMethod;
}

export interface ConfirmPaymentDTO {
    status: "SUCCESSFUL" | "FAILED";
}
