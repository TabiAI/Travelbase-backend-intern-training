import {BookingStatus, PaymentStatus, Prisma} from "@prisma/client";
import {prisma} from "../lib/db";
import {BadRequestError, CustomErrorCode} from "../exceptions";

type PassengerCreateInput = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: Date;
    type: "ADULT" | "CHILD" | "INFANT";
    seatNumber?: string;
    seatClass?: "ECONOMY" | "BUSINESS" | "FIRST";
};

class FlightRepository {

    static async findFlights(originCode: string, destinationCode: string, departureDate: string) {
        const start = new Date(departureDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(departureDate);
        end.setUTCHours(23, 59, 59, 999);

        return prisma.flights.findMany({
            where: {
                originAirport: {code: originCode},
                destinationAirport: {code: destinationCode},
                departureTime: {gte: start, lte: end},
                status: "SCHEDULED",
                availableSeats: {gt: 0},
            },
            include: {
                airline: true,
                originAirport: true,
                destinationAirport: true,
            },
            orderBy: {departureTime: "asc"},
        });
    }

    static async findFlightById(id: string) {
        return prisma.flights.findUnique({
            where: {id},
            include: {
                airline: true,
                originAirport: true,
                destinationAirport: true,
                Seats: true,
            },
        });
    }

    static async createBookingWithPassengers(
        userId: string,
        flightId: string,
        totalAmount: Prisma.Decimal,
        currency: string,
        passengers: PassengerCreateInput[]
    ) {
        return prisma.$transaction(async (tx) => {
            const updated = await tx.flights.updateMany({
                where: {id: flightId, availableSeats: {gte: passengers.length}},
                data: {availableSeats: {decrement: passengers.length}},
            });

            if (updated.count === 0) {
                throw new BadRequestError({
                    msg: "Not enough available seats on this flight",
                    errorCode: CustomErrorCode.FLIGHT_UNAVAILABLE,
                });
            }

            const booking = await tx.bookings.create({
                data: {userId, flightId, totalAmount, currency, status: "PENDING"},
            });

            const createdPassengers = await Promise.all(
                passengers.map((p) =>
                    tx.passengers.create({
                        data: {
                            bookingId: booking.id,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            email: p.email,
                            phone: p.phone,
                            passportNumber: p.passportNumber,
                            nationality: p.nationality,
                            dateOfBirth: p.dateOfBirth,
                            type: p.type,
                        },
                    })
                )
            );

            const seatAssignments = passengers
                .map((p, i) => ({passenger: createdPassengers[i], input: p}))
                .filter((item) => item.input.seatNumber);

            if (seatAssignments.length > 0) {
                await Promise.all(
                    seatAssignments.map(({passenger, input}) =>
                        tx.seats.create({
                            data: {
                                flightId,
                                bookingId: booking.id,
                                passengerId: passenger.id,
                                seatNumber: input.seatNumber!,
                                class: input.seatClass ?? "ECONOMY",
                            },
                        })
                    )
                );
            }

            return {booking, passengers: createdPassengers};
        });
    }

    static async updateBookingStatus(id: string, status: BookingStatus) {
        return prisma.bookings.update({where: {id}, data: {status}});
    }

    static async findBookingById(id: string) {
        return prisma.bookings.findUnique({
            where: {id},
            include: {
                flight: {
                    include: {airline: true, originAirport: true, destinationAirport: true},
                },
                Passengers: true,
                Seats: true,
                Payments: true,
            },
        });
    }

    static async findBookingsByUserId(userId: string, skip: number, take: number) {
        const [bookings, total] = await prisma.$transaction([
            prisma.bookings.findMany({
                where: {userId},
                include: {
                    flight: {
                        include: {airline: true, originAirport: true, destinationAirport: true},
                    },
                    Passengers: true,
                },
                orderBy: {createdAt: "desc"},
                skip,
                take,
            }),
            prisma.bookings.count({where: {userId}}),
        ]);

        return {bookings, total};
    }

    static async createPayment(data: {
        bookingId: string;
        userId: string;
        amount: Prisma.Decimal;
        currency: string;
        paymentMethod: "CARD" | "BANK_TRANSFER" | "WALLET";
        transactionRef: string;
    }) {
        return prisma.payments.create({data: {...data, status: "PENDING"}});
    }

    static async findPaymentById(id: string) {
        return prisma.payments.findUnique({where: {id}});
    }

    static async updatePaymentStatus(id: string, status: PaymentStatus) {
        return prisma.payments.update({where: {id}, data: {status}});
    }
}

export default FlightRepository;
