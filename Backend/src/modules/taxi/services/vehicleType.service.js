import { TaxiVehicleType } from '../models/taxiVehicleType.model.js';
import { NotFoundError, ValidationError } from '../../../core/auth/errors.js';
import { resolveActionPerformerSnapshot } from '../../../core/utils/performer.js';
import { parseListQuery, buildDateRangeFilter, toTaxiPagination, escapeRegex } from '../utils/pagination.util.js';
import { mapVehicleType } from '../utils/mappers.util.js';
import {
    validateCreateVehicleTypeDto,
    validateUpdateVehicleTypeDto,
    validateVehicleTypeId,
    validateVehicleTypeStatusDto,
} from '../validators/vehicleType.validator.js';
import { validateListQuery } from '../validators/listQuery.validator.js';
import { applySoftDelete } from '../utils/softDelete.util.js';
import { generateVehicleTypeCode } from '../utils/vehicleCode.util.js';

const baseFilter = { isDeleted: { $ne: true } };

const buildSort = (sortBy, sortOrder) => {
    const allowed = ['name', 'category', 'status', 'displayOrder', 'code', 'seats', 'createdAt'];
    const key = allowed.includes(sortBy) ? sortBy : 'displayOrder';
    return { [key]: sortOrder };
};

export async function listVehicleTypes(query = {}) {
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter };

    if (parsed.status) filter.status = parsed.status;
    if (parsed.category) filter.category = parsed.category;

    if (parsed.search) {
        const term = escapeRegex(parsed.search);
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { category: { $regex: term, $options: 'i' } },
            { code: { $regex: term, $options: 'i' } },
        ];
    }

    const dateRange = buildDateRangeFilter(parsed.createdFrom, parsed.createdTo);
    if (dateRange) filter.createdAt = dateRange;

    const sort = buildSort(parsed.sortBy, parsed.sortOrder);

    const [docs, total] = await Promise.all([
        TaxiVehicleType.find(filter)
            .sort(sort)
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        TaxiVehicleType.countDocuments(filter),
    ]);

    const records = docs.map((doc) => mapVehicleType(doc));
    return toTaxiPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}

export async function getVehicleTypeById(id) {
    const vehicleTypeId = validateVehicleTypeId(id);
    const doc = await TaxiVehicleType.findOne({ _id: vehicleTypeId, ...baseFilter }).lean();
    if (!doc) throw new NotFoundError('Vehicle type not found');
    return mapVehicleType(doc);
}

export async function createVehicleType(body, reqUser) {
    const payload = validateCreateVehicleTypeDto(body);
    const performer = await resolveActionPerformerSnapshot(reqUser);

    const code = payload.code || await generateVehicleTypeCode();

    const existingCode = await TaxiVehicleType.findOne({
        ...baseFilter,
        code,
    }).select('_id').lean();
    if (existingCode) {
        throw new ValidationError('Vehicle type code already exists');
    }

    const doc = await TaxiVehicleType.create({
        ...payload,
        code,
        createdBy: performer,
        updatedBy: performer,
        statusHistory: [{ status: payload.status, changedBy: performer }],
    });

    return mapVehicleType(doc.toObject());
}

export async function updateVehicleType(id, body, reqUser) {
    const vehicleTypeId = validateVehicleTypeId(id);
    const payload = validateUpdateVehicleTypeDto(body);
    const doc = await TaxiVehicleType.findOne({ _id: vehicleTypeId, ...baseFilter });
    if (!doc) throw new NotFoundError('Vehicle type not found');

    if (payload.code && payload.code !== doc.code) {
        const existingCode = await TaxiVehicleType.findOne({
            ...baseFilter,
            code: payload.code,
            _id: { $ne: doc._id },
        }).select('_id').lean();
        if (existingCode) {
            throw new ValidationError('Vehicle type code already exists');
        }
    }

    const performer = await resolveActionPerformerSnapshot(reqUser);
    Object.assign(doc, payload);
    doc.updatedBy = performer;
    await doc.save();

    return mapVehicleType(doc.toObject());
}

export async function updateVehicleTypeStatus(id, body, reqUser) {
    const vehicleTypeId = validateVehicleTypeId(id);
    const { status } = validateVehicleTypeStatusDto(body);
    const doc = await TaxiVehicleType.findOne({ _id: vehicleTypeId, ...baseFilter });
    if (!doc) throw new NotFoundError('Vehicle type not found');

    const performer = await resolveActionPerformerSnapshot(reqUser);
    doc.status = status;
    doc.updatedBy = performer;
    doc.statusHistory.push({ status, changedBy: performer });
    await doc.save();

    return mapVehicleType(doc.toObject());
}

export async function deleteVehicleType(id, reqUser) {
    const vehicleTypeId = validateVehicleTypeId(id);
    const doc = await TaxiVehicleType.findOne({ _id: vehicleTypeId, ...baseFilter });
    if (!doc) throw new NotFoundError('Vehicle type not found');

    const performer = await resolveActionPerformerSnapshot(reqUser);
    applySoftDelete(doc, performer);
    await doc.save();

    return { id: vehicleTypeId };
}

export async function listVehicleTypeDropdown() {
    const docs = await TaxiVehicleType.find({ ...baseFilter, status: 'active' })
        .sort({ displayOrder: 1, name: 1 })
        .select('name code category icon seats status')
        .lean();

    return docs.map((doc) => mapVehicleType(doc));
}
