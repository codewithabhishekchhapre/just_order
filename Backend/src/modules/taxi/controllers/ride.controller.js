import { sendResponse } from '../../../utils/response.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as rideService from '../services/ride.service.js';
import * as rideDispatchService from '../services/rideDispatch.service.js';

export const quoteRide = asyncHandler(async (req, res) => {
    const quote = await rideService.quoteRide(req.body);
    return sendResponse(res, 200, 'Fare quote generated successfully', { quote });
});

export const createRide = asyncHandler(async (req, res) => {
    const ride = await rideService.createRide(req.user?.userId, req.body);
    return sendResponse(res, 201, 'Ride created successfully', { ride });
});

export const listMyRides = asyncHandler(async (req, res) => {
    const data = await rideService.listRidesForUser(req.user?.userId, req.query);
    return sendResponse(res, 200, 'Rides fetched successfully', data);
});

export const getMyActiveRide = asyncHandler(async (req, res) => {
    const ride = await rideService.getActiveRideForUser(req.user?.userId);
    return sendResponse(res, 200, 'Active ride fetched successfully', { ride });
});

export const getMyRideById = asyncHandler(async (req, res) => {
    const ride = await rideService.getRideById(req.params.id, {
        userId: req.user?.userId,
        includeOtp: true,
        includeDriver: true,
    });
    return sendResponse(res, 200, 'Ride fetched successfully', { ride });
});

export const cancelMyRide = asyncHandler(async (req, res) => {
    const ride = await rideService.cancelRideByUser(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Ride cancelled successfully', { ride });
});

export const listAdminRides = asyncHandler(async (req, res) => {
    const data = await rideService.listRidesAdmin(req.query);
    return sendResponse(res, 200, 'Rides fetched successfully', data);
});

export const getAdminRideById = asyncHandler(async (req, res) => {
    const ride = await rideService.getRideById(req.params.id, { includeOtp: true });
    return sendResponse(res, 200, 'Ride fetched successfully', { ride });
});

export const getActivePartnerRide = asyncHandler(async (req, res) => {
    const ride = await rideDispatchService.getActiveRideForPartner(req.user?.userId);
    return sendResponse(res, 200, 'Active ride fetched successfully', { ride });
});

export const acceptRide = asyncHandler(async (req, res) => {
    const ride = await rideDispatchService.acceptRide(req.user?.userId, req.params.id);
    return sendResponse(res, 200, 'Ride accepted successfully', { ride });
});

export const markArrived = asyncHandler(async (req, res) => {
    const ride = await rideDispatchService.markArrived(req.user?.userId, req.params.id);
    return sendResponse(res, 200, 'Marked arrived successfully', { ride });
});

export const startRide = asyncHandler(async (req, res) => {
    const ride = await rideDispatchService.startRide(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Ride started successfully', { ride });
});

export const completeRide = asyncHandler(async (req, res) => {
    const ride = await rideDispatchService.completeRide(req.user?.userId, req.params.id, req.body);
    return sendResponse(res, 200, 'Ride completed successfully', { ride });
});
