import { sendResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as tripService from '../services/trip.service.js';
import * as tripDispatchService from '../services/tripDispatch.service.js';
import * as vehicleService from '../services/vehicle.service.js';

export const listPublicVehicles = asyncHandler(async (_req, res) => {
    const vehicles = await vehicleService.listPublicVehicles();
    return sendResponse(res, 200, 'Vehicles fetched successfully', { vehicles });
});

export const quoteTrip = asyncHandler(async (req, res) => {
    const quote = await tripService.quoteTrip(req.body);
    return sendResponse(res, 200, 'Fare quote generated successfully', { quote });
});

export const createTrip = asyncHandler(async (req, res) => {
    const trip = await tripService.createTrip(req.user?.userId, req.body);
    return sendResponse(res, 201, 'Trip created successfully', { trip });
});

export const listMyTrips = asyncHandler(async (req, res) => {
    const data = await tripService.listTripsForUser(req.user?.userId, req.query);
    return sendResponse(res, 200, 'Trips fetched successfully', data);
});

export const getMyTripById = asyncHandler(async (req, res) => {
    const trip = await tripService.getTripById(req.params.id, {
        userId: req.user?.userId,
        includeOtp: false,
    });
    return sendResponse(res, 200, 'Trip fetched successfully', { trip });
});

export const cancelMyTrip = asyncHandler(async (req, res) => {
    const trip = await tripService.cancelTripByUser(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Trip cancelled successfully', { trip });
});

export const listAdminTrips = asyncHandler(async (req, res) => {
    const data = await tripService.listTripsAdmin(req.query);
    return sendResponse(res, 200, 'Trips fetched successfully', data);
});

export const getAdminTripById = asyncHandler(async (req, res) => {
    const trip = await tripService.getTripById(req.params.id, { includeOtp: true });
    return sendResponse(res, 200, 'Trip fetched successfully', { trip });
});

export const acceptTrip = asyncHandler(async (req, res) => {
    const trip = await tripDispatchService.acceptTrip(req.user?.userId, req.params.id);
    return sendResponse(res, 200, 'Trip accepted successfully', { trip });
});

export const markArrived = asyncHandler(async (req, res) => {
    const trip = await tripDispatchService.markArrived(req.user?.userId, req.params.id);
    return sendResponse(res, 200, 'Marked arrived successfully', { trip });
});

export const startTrip = asyncHandler(async (req, res) => {
    const trip = await tripDispatchService.startTrip(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Trip started successfully', { trip });
});

export const completeTrip = asyncHandler(async (req, res) => {
    const trip = await tripDispatchService.completeTrip(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Trip completed successfully', { trip });
});
