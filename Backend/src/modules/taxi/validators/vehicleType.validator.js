import { z } from 'zod';
import mongoose from 'mongoose';
import { ValidationError } from '../../../core/auth/errors.js';

const vehicleTypeBodySchema = z.object({
    name: z.string().min(1, 'Vehicle type name is required').max(120),
    code: z.string().max(40).optional(),
    category: z.enum(['bike', 'auto', 'car', 'suv'], {
        errorMap: () => ({ message: 'Category must be bike, auto, car, or suv' }),
    }),
    icon: z.string().max(200).optional(),
    seats: z.coerce.number().int().min(1).max(20).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
});

export const validateCreateVehicleTypeDto = (body = {}) => {
    const result = vehicleTypeBodySchema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return {
        ...result.data,
        name: result.data.name.trim(),
        code: result.data.code ? result.data.code.trim().toUpperCase() : undefined,
        category: result.data.category,
        icon: (result.data.icon || 'Car').trim(),
        seats: result.data.seats ?? (result.data.category === 'bike' ? 1 : result.data.category === 'auto' ? 3 : 4),
        status: result.data.status || 'active',
        displayOrder: result.data.displayOrder ?? 0,
    };
};

export const validateUpdateVehicleTypeDto = (body = {}) => {
    const partial = vehicleTypeBodySchema.partial().safeParse(body);
    if (!partial.success) {
        throw new ValidationError(partial.error.errors[0].message);
    }
    const data = { ...partial.data };
    if (data.name !== undefined) data.name = data.name.trim();
    if (data.code !== undefined) data.code = data.code.trim().toUpperCase();
    if (data.icon !== undefined) data.icon = data.icon.trim();
    return data;
};

export const validateVehicleTypeId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
        throw new ValidationError('Invalid vehicle type id');
    }
    return String(id);
};

export const validateVehicleTypeStatusDto = (body = {}) => {
    const status = String(body.status || '').trim();
    if (!['active', 'inactive'].includes(status)) {
        throw new ValidationError('Invalid vehicle type status');
    }
    return { status };
};
