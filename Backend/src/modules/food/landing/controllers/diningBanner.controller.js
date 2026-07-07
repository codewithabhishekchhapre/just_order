import {
    listDiningBanners,
    createDiningBannersFromFiles,
    deleteDiningBanner,
    updateDiningBannerOrder,
    toggleDiningBannerStatus
} from '../services/diningBanner.service.js';
import { sendResponse } from '../../../../utils/response.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { invalidateCache } from '../../../../middleware/cache.js';

const invalidateDiningBannerCache = () => invalidateCache('dining_banners_public:*');

export const listDiningBannersController = async (req, res, next) => {
    try {
        const data = await listDiningBanners();
        return sendResponse(res, 200, 'Dining banners fetched successfully', { banners: data });
    } catch (error) {
        next(error);
    }
};

export const uploadDiningBannersController = async (req, res, next) => {
    try {
        if (!req.files || !req.files.length) {
            throw new ValidationError('No files uploaded');
        }

        const meta = {
            title: req.body.title,
            ctaText: req.body.ctaText,
            ctaLink: req.body.ctaLink,
            diningType: req.body.diningType,
        };

        const results = await createDiningBannersFromFiles(req.files, meta);
        await invalidateDiningBannerCache();
        return sendResponse(res, 201, 'Dining banners uploaded', { banners: results });
    } catch (error) {
        next(error);
    }
};

export const deleteDiningBannerController = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ValidationError('Banner id is required');
        }
        const result = await deleteDiningBanner(id);
        await invalidateDiningBannerCache();
        return sendResponse(res, 200, result.deleted ? 'Dining banner deleted' : 'Dining banner not found', result);
    } catch (error) {
        next(error);
    }
};

export const updateDiningBannerOrderController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { order } = req.body;
        const sortOrder = Number(order);
        if (!id || Number.isNaN(sortOrder)) {
            throw new ValidationError('id and numeric order are required');
        }
        const updated = await updateDiningBannerOrder(id, sortOrder);
        await invalidateDiningBannerCache();
        return sendResponse(res, 200, 'Dining banner order updated', updated);
    } catch (error) {
        next(error);
    }
};

export const toggleDiningBannerStatusController = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ValidationError('Banner id is required');
        }
        const banners = await listDiningBanners();
        const banner = banners.find(b => b._id.toString() === id);
        if (!banner) {
            throw new ValidationError('Dining banner not found');
        }
        const updated = await toggleDiningBannerStatus(id, !banner.isActive);
        await invalidateDiningBannerCache();
        return sendResponse(res, 200, 'Dining banner status updated', updated);
    } catch (error) {
        next(error);
    }
};

