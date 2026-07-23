import mongoose from 'mongoose';
import { actionPerformerSchema } from '../../../core/models/actionPerformer.schema.js';

const placeSchema = new mongoose.Schema(
    {
        address: { type: String, default: '', trim: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        placeId: { type: String, default: '', trim: true },
    },
    { _id: false },
);

const fareSchema = new mongoose.Schema(
    {
        base: { type: Number, default: 0, min: 0 },
        distance: { type: Number, default: 0, min: 0 },
        time: { type: Number, default: 0, min: 0 },
        waiting: { type: Number, default: 0, min: 0 },
        platformFee: { type: Number, default: 0, min: 0 },
        serviceTax: { type: Number, default: 0, min: 0 },
        surgeMultiplier: { type: Number, default: 1, min: 0 },
        subtotal: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'INR', trim: true },
    },
    { _id: false },
);

const parcelSchema = new mongoose.Schema(
    {
        description: { type: String, default: '', trim: true },
        weightKg: { type: Number, default: 0, min: 0 },
        size: { type: String, default: '', trim: true },
    },
    { _id: false },
);

const offerEntrySchema = new mongoose.Schema(
    {
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
        at: { type: Date, default: Date.now },
        action: { type: String, default: 'offered', trim: true },
    },
    { _id: false },
);

export const PORTER_TRIP_STATUSES = [
    'quoted',
    'searching',
    'assigned',
    'en_route_pickup',
    'at_pickup',
    'in_transit',
    'at_drop',
    'completed',
    'cancelled_by_user',
    'cancelled_by_driver',
    'cancelled_by_system',
];

const porterTripSchema = new mongoose.Schema(
    {
        tripNumber: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            required: true,
            index: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PorterVehicle',
            required: true,
            index: true,
        },
        zoneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PorterZone',
            default: null,
            index: true,
        },
        pickup: { type: placeSchema, required: true },
        drop: { type: placeSchema, required: true },
        parcel: { type: parcelSchema, default: () => ({}) },
        distanceKm: { type: Number, default: 0, min: 0 },
        durationMin: { type: Number, default: 0, min: 0 },
        fare: { type: fareSchema, default: () => ({}) },
        fareEstimateTotal: { type: Number, default: 0, min: 0 },
        payment: {
            method: { type: String, default: 'cash', trim: true },
            status: {
                type: String,
                enum: ['pending', 'paid', 'failed', 'refunded'],
                default: 'pending',
            },
            paymentId: { type: String, default: null },
        },
        status: {
            type: String,
            enum: PORTER_TRIP_STATUSES,
            default: 'quoted',
            index: true,
        },
        dispatch: {
            status: {
                type: String,
                enum: ['unassigned', 'assigned', 'accepted', 'cancelled'],
                default: 'unassigned',
            },
            deliveryPartnerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Driver',
                default: null,
            },
            offeredTo: { type: [offerEntrySchema], default: [] },
            assignedAt: { type: Date, default: null },
            acceptedAt: { type: Date, default: null },
        },
        deliveryOtp: { type: String, default: null },
        assignedAt: { type: Date, default: null },
        arrivedAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: '', trim: true },
        driverRating: { type: Number, default: null, min: 1, max: 5 },
        userRating: { type: Number, default: null, min: 1, max: 5 },
        lastDriverLocation: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            at: { type: Date, default: null },
        },
        module: {
            type: String,
            default: 'porter',
            index: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: actionPerformerSchema, default: null },
        createdBy: { type: actionPerformerSchema, default: null },
        updatedBy: { type: actionPerformerSchema, default: null },
    },
    {
        collection: 'porter_trips',
        timestamps: true,
    },
);

porterTripSchema.index({ status: 1, createdAt: -1 });
porterTripSchema.index({ userId: 1, status: 1, createdAt: -1 });
porterTripSchema.index({ 'dispatch.deliveryPartnerId': 1, status: 1 });
porterTripSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
porterTripSchema.index(
    { tripNumber: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const PorterTrip = mongoose.models.PorterTrip
    || mongoose.model('PorterTrip', porterTripSchema, 'porter_trips');
