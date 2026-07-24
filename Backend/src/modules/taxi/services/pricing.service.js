import { TaxiPricing } from '../models/taxiPricing.model.js';
import { TaxiVehicleType } from '../models/taxiVehicleType.model.js';
import { TaxiZone } from '../models/taxiZone.model.js';
import { NotFoundError, ValidationError } from '../../../core/auth/errors.js';
import { resolveActionPerformerSnapshot } from '../../../core/utils/performer.js';
import { parseListQuery, buildDateRangeFilter, toTaxiPagination, escapeRegex } from '../utils/pagination.util.js';
import { mapPricing } from '../utils/mappers.util.js';
import {
    validateCreatePricingDto,
    validateUpdatePricingDto,
    validatePricingId,
    validatePricingStatusDto,
} from '../validators/pricing.validator.js';
import { validateListQuery } from '../validators/listQuery.validator.js';
import { validateVehicleTypeId } from '../validators/vehicleType.validator.js';

const baseFilter = { isDeleted: { $ne: true } };

const buildSort = (sortBy, sortOrder) => {
    const allowed = ['status', 'baseFare', 'perKmRate', 'surgeMultiplier', 'createdAt'];
    const key = allowed.includes(sortBy) ? sortBy : 'createdAt';
    return { [key]: sortOrder };
};

async function getVehicleTypeOrThrow(vehicleTypeId) {
    const doc = await TaxiVehicleType.findOne({ _id: vehicleTypeId, isDeleted: { $ne: true } }).lean();
    if (!doc) throw new NotFoundError('Vehicle type not found');
    return doc;
}

async function getZoneOrNull(zoneId) {
    if (!zoneId) return null;
    return TaxiZone.findOne({ _id: zoneId, isDeleted: { $ne: true } }).lean();
}

export async function listPricing(query = {}) {
    validateListQuery(query);
    const parsed = parseListQuery(query);
    const filter = { ...baseFilter };

    if (parsed.status) filter.status = parsed.status;
    if (parsed.vehicleTypeId) filter.vehicleTypeId = parsed.vehicleTypeId;
    if (parsed.zoneId === 'null' || parsed.zoneId === 'global') {
        filter.zoneId = null;
    } else if (parsed.zoneId) {
        filter.zoneId = parsed.zoneId;
    }

    if (parsed.search) {
        const term = escapeRegex(parsed.search);
        const vehicles = await TaxiVehicleType.find({
            isDeleted: { $ne: true },
            $or: [
                { name: { $regex: term, $options: 'i' } },
                { category: { $regex: term, $options: 'i' } },
                { code: { $regex: term, $options: 'i' } },
            ],
        }).select('_id').lean();
        filter.vehicleTypeId = { $in: vehicles.map((v) => v._id) };
    }

    const dateRange = buildDateRangeFilter(parsed.createdFrom, parsed.createdTo);
    if (dateRange) filter.createdAt = dateRange;

    const sort = buildSort(parsed.sortBy, parsed.sortOrder);

    const [docs, total] = await Promise.all([
        TaxiPricing.find(filter)
            .sort(sort)
            .skip(parsed.skip)
            .limit(parsed.limit)
            .lean(),
        TaxiPricing.countDocuments(filter),
    ]);

    const vehicleTypeIds = [...new Set(docs.map((d) => String(d.vehicleTypeId)))];
    const zoneIds = [...new Set(docs.map((d) => (d.zoneId ? String(d.zoneId) : null)).filter(Boolean))];

    const [vehicles, zones] = await Promise.all([
        TaxiVehicleType.find({ _id: { $in: vehicleTypeIds } })
            .select('name category code status icon seats')
            .lean(),
        zoneIds.length
            ? TaxiZone.find({ _id: { $in: zoneIds } }).select('name country status').lean()
            : Promise.resolve([]),
    ]);

    const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
    const zoneMap = new Map(zones.map((z) => [String(z._id), z]));

    const records = docs.map((doc) => mapPricing(
        doc,
        vehicleMap.get(String(doc.vehicleTypeId)),
        doc.zoneId ? zoneMap.get(String(doc.zoneId)) : null,
    ));

    return toTaxiPagination({ docs: records, total, page: parsed.page, limit: parsed.limit });
}

export async function getPricingById(id) {
    const pricingId = validatePricingId(id);
    const doc = await TaxiPricing.findOne({ _id: pricingId, ...baseFilter }).lean();
    if (!doc) throw new NotFoundError('Pricing not found');

    const vehicleType = await getVehicleTypeOrThrow(doc.vehicleTypeId);
    const zone = await getZoneOrNull(doc.zoneId);
    return mapPricing(doc, vehicleType, zone);
}

export async function getPricingByVehicleTypeId(vehicleTypeIdRaw, zoneId = null) {
    const vehicleTypeId = validateVehicleTypeId(vehicleTypeIdRaw);
    const filter = {
        vehicleTypeId,
        zoneId: zoneId || null,
        ...baseFilter,
    };
    let doc = await TaxiPricing.findOne(filter).lean();
    if (!doc && zoneId) {
        doc = await TaxiPricing.findOne({
            vehicleTypeId,
            zoneId: null,
            ...baseFilter,
        }).lean();
    }
    if (!doc) throw new NotFoundError('Pricing not found for vehicle type');
    const vehicleType = await getVehicleTypeOrThrow(vehicleTypeId);
    const zone = await getZoneOrNull(doc.zoneId);
    return mapPricing(doc, vehicleType, zone);
}

export async function createPricing(body, reqUser) {
    const payload = validateCreatePricingDto(body);
    const performer = await resolveActionPerformerSnapshot(reqUser);
    await getVehicleTypeOrThrow(payload.vehicleTypeId);
    if (payload.zoneId) {
        const zone = await getZoneOrNull(payload.zoneId);
        if (!zone) throw new NotFoundError('Zone not found');
    }

    const existing = await TaxiPricing.findOne({
        vehicleTypeId: payload.vehicleTypeId,
        zoneId: payload.zoneId || null,
        isDeleted: { $ne: true },
    }).select('_id').lean();

    if (existing) {
        throw new ValidationError('Pricing already exists for this vehicle type and zone');
    }

    const doc = await TaxiPricing.create({
        ...payload,
        createdBy: performer,
        updatedBy: performer,
        statusHistory: [{ status: payload.status, changedBy: performer }],
    });

    const vehicleType = await getVehicleTypeOrThrow(payload.vehicleTypeId);
    const zone = await getZoneOrNull(payload.zoneId);
    return mapPricing(doc.toObject(), vehicleType, zone);
}

export async function updatePricing(id, body, reqUser) {
    const pricingId = validatePricingId(id);
    const payload = validateUpdatePricingDto(body);
    const doc = await TaxiPricing.findOne({ _id: pricingId, ...baseFilter });
    if (!doc) throw new NotFoundError('Pricing not found');

    const performer = await resolveActionPerformerSnapshot(reqUser);
    Object.assign(doc, payload);
    doc.updatedBy = performer;
    await doc.save();

    const vehicleType = await getVehicleTypeOrThrow(doc.vehicleTypeId);
    const zone = await getZoneOrNull(doc.zoneId);
    return mapPricing(doc.toObject(), vehicleType, zone);
}

export async function updatePricingStatus(id, body, reqUser) {
    const pricingId = validatePricingId(id);
    const { status } = validatePricingStatusDto(body);
    const doc = await TaxiPricing.findOne({ _id: pricingId, ...baseFilter });
    if (!doc) throw new NotFoundError('Pricing not found');

    const performer = await resolveActionPerformerSnapshot(reqUser);
    doc.status = status;
    doc.updatedBy = performer;
    doc.statusHistory.push({ status, changedBy: performer });
    await doc.save();

    const vehicleType = await getVehicleTypeOrThrow(doc.vehicleTypeId);
    const zone = await getZoneOrNull(doc.zoneId);
    return mapPricing(doc.toObject(), vehicleType, zone);
}

export async function deletePricing(id, reqUser) {
    const pricingId = validatePricingId(id);
    const performer = await resolveActionPerformerSnapshot(reqUser);

    const doc = await TaxiPricing.findOneAndUpdate(
        { _id: pricingId, ...baseFilter },
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: performer || null,
                updatedBy: performer || null,
            },
        },
        { new: true },
    );

    if (!doc) throw new NotFoundError('Pricing not found');

    return { id: pricingId, deleted: true };
}
