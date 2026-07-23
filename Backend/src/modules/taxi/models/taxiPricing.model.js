import mongoose from 'mongoose';
import { actionPerformerSchema } from '../../../core/models/actionPerformer.schema.js';

const taxiPricingSchema = new mongoose.Schema(
    {
        vehicleTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TaxiVehicleType',
            required: true,
            index: true,
        },
        zoneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TaxiZone',
            default: null,
            index: true,
        },
        baseFare: {
            type: Number,
            default: 0,
            min: 0,
        },
        baseDistanceKm: {
            type: Number,
            default: 0,
            min: 0,
        },
        perKmRate: {
            type: Number,
            default: 0,
            min: 0,
        },
        perMinRate: {
            type: Number,
            default: 0,
            min: 0,
        },
        freeWaitMinutes: {
            type: Number,
            default: 0,
            min: 0,
        },
        perMinWaitRate: {
            type: Number,
            default: 0,
            min: 0,
        },
        platformFee: {
            type: Number,
            default: 0,
            min: 0,
        },
        surgeMultiplier: {
            type: Number,
            default: 1,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
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
        statusHistory: {
            type: [{
                status: { type: String, enum: ['active', 'inactive'] },
                changedAt: { type: Date, default: Date.now },
                changedBy: { type: actionPerformerSchema, default: null },
            }],
            default: [],
        },
    },
    {
        collection: 'taxi_pricing',
        timestamps: true,
    },
);

taxiPricingSchema.index(
    { vehicleTypeId: 1, zoneId: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
);
taxiPricingSchema.index({ status: 1, vehicleTypeId: 1 });
taxiPricingSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const TaxiPricing = mongoose.models.TaxiPricing
    || mongoose.model('TaxiPricing', taxiPricingSchema, 'taxi_pricing');
