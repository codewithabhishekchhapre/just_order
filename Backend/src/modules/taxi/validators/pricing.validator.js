import { z } from 'zod';
import mongoose from 'mongoose';
import { ValidationError } from '../../../core/auth/errors.js';

const pricingBodySchema = z.object({
    vehicleTypeId: z.string().min(1, 'Vehicle type is required'),
    zoneId: z.string().optional().nullable(),
    baseFare: z.coerce.number().min(0, 'Base fare is required'),
    baseDistanceKm: z.coerce.number().min(0).optional(),
    perKmRate: z.coerce.number().min(0, 'Per km rate is required'),
    perMinRate: z.coerce.number().min(0).optional(),
    freeWaitMinutes: z.coerce.number().min(0).optional(),
    perMinWaitRate: z.coerce.number().min(0).optional(),
    platformFee: z.coerce.number().min(0).optional(),
    surgeMultiplier: z.coerce.number().min(0).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

export const validateCreatePricingDto = (body = {}) => {
    const result = pricingBodySchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    if (!mongoose.Types.ObjectId.isValid(result.data.vehicleTypeId)) {
        throw new ValidationError('Invalid vehicle type id');
    }
    if (result.data.zoneId && !mongoose.Types.ObjectId.isValid(result.data.zoneId)) {
        throw new ValidationError('Invalid zone id');
    }
    return {
        ...result.data,
        zoneId: result.data.zoneId || null,
        baseDistanceKm: result.data.baseDistanceKm ?? 0,
        perMinRate: result.data.perMinRate ?? 0,
        freeWaitMinutes: result.data.freeWaitMinutes ?? 0,
        perMinWaitRate: result.data.perMinWaitRate ?? 0,
        platformFee: result.data.platformFee ?? 0,
        surgeMultiplier: result.data.surgeMultiplier ?? 1,
        status: result.data.status || 'active',
    };
};

export const validateUpdatePricingDto = (body = {}) => {
    const partial = pricingBodySchema.omit({ vehicleTypeId: true }).partial().safeParse(body);
    if (!partial.success) {
        throw new ValidationError(partial.error.errors[0].message);
    }
    const data = { ...partial.data };
    if (data.zoneId !== undefined && data.zoneId && !mongoose.Types.ObjectId.isValid(data.zoneId)) {
        throw new ValidationError('Invalid zone id');
    }
    if (data.zoneId === '') data.zoneId = null;
    return data;
};

export const validatePricingId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
        throw new ValidationError('Invalid pricing id');
    }
    return String(id);
};

export const validatePricingStatusDto = (body = {}) => {
    const status = String(body.status || '').trim();
    if (!['active', 'inactive'].includes(status)) {
        throw new ValidationError('Invalid pricing status');
    }
    return { status };
};
