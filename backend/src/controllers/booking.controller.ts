import type { Request, Response } from "express";
import { created, ok } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as bookingService from "../services/booking.service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.listBookings(
    req.query as unknown as bookingService.BookingListQuery,
    req.user?.branchId ?? null,
  );
  res.json(ok(result));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getBooking(String(req.params.id));
  res.json(ok(booking));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(
    req.body,
    req.user!.sub,
    req.user?.branchId ?? null,
  );
  res.status(201).json(created(booking, "Booking created"));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBooking(
    String(req.params.id),
    req.body,
    req.user!.sub,
  );
  res.json(ok(booking, "Booking updated"));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingStatus(
    String(req.params.id),
    req.body.status,
    req.user!.sub,
  );
  res.json(ok(booking, "Booking status updated"));
});

export const customerHistory = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listBookingsByCustomer(String(req.params.customerId));
  res.json(ok(bookings));
});
