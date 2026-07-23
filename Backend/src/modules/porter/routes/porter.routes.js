import express from 'express';
import {
    authMiddleware,
    checkPermission,
    getCachedRolePermissions,
} from '../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../core/roles/role.middleware.js';
import { upload } from '../../../middleware/upload.js';
import { sendError } from '../../../utils/response.js';
import { FoodAdmin } from '../../../core/admin/admin.model.js';

import {
    listZones,
    getZoneById,
    createZone,
    updateZone,
    patchZoneStatus,
    deleteZone,
    listZoneDropdown,
} from '../controllers/zone.controller.js';

import {
    listVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    patchVehicleStatus,
    deleteVehicle,
    listVehicleDropdown,
    uploadVehicleIcon,
} from '../controllers/vehicle.controller.js';

import {
    listPricing,
    getPricingById,
    getPricingByVehicleId,
    createPricing,
    updatePricing,
    patchPricingStatus,
    deletePricing,
    upsertVehiclePricing,
    clearVehiclePricing,
} from '../controllers/pricing.controller.js';

import {
    listCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    patchCouponStatus,
    deleteCoupon,
    getCouponSummary,
} from '../controllers/coupon.controller.js';

import {
    listBanners,
    getBannerById,
    createBanner,
    updateBanner,
    patchBannerStatus,
    deleteBanner,
    getBannerStats,
} from '../controllers/banner.controller.js';

import {
    listPorterUsers,
    getPorterUserById,
    updatePorterUser,
    deletePorterUser,
} from '../controllers/user.controller.js';

import {
    listPublicVehicles,
    quoteTrip,
    createTrip,
    listMyTrips,
    getMyTripById,
    cancelMyTrip,
    listAdminTrips,
    getAdminTripById,
    acceptTrip,
    markArrived,
    startTrip,
    completeTrip,
} from '../controllers/trip.controller.js';

const router = express.Router();
const adminOrEmployee = [authMiddleware, requireRoles('ADMIN', 'EMPLOYEE')];
const userOnly = [authMiddleware, requireRoles('USER')];
const partnerOnly = [authMiddleware, requireRoles('DELIVERY_PARTNER')];

/** Accept either porter::trips or porter::orders view permission. */
const checkPorterTripView = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return sendError(res, 401, 'Authentication required');
        if (user.role === 'ADMIN') return next();
        if (user.role !== 'EMPLOYEE') {
            return sendError(res, 403, 'Access denied: insufficient privileges');
        }

        const employee = await FoodAdmin.findById(user.userId)
            .select('adminRoleId isActive')
            .lean();
        if (!employee || !employee.isActive) {
            return sendError(res, 403, 'Employee account is suspended or inactive');
        }
        if (!employee.adminRoleId) {
            return sendError(res, 403, 'No administrative role assigned to this account');
        }

        const permissions = await getCachedRolePermissions(employee.adminRoleId);
        if (!permissions) {
            return sendError(res, 403, 'Assigned administrative role is inactive');
        }

        const keys = ['porter::trips', 'porter::orders'];
        const hasPerm = keys.some((key) => {
            if (permissions[key]?.view === true) return true;
            const prefix = `${key}::`;
            return Object.entries(permissions).some(
                ([k, val]) => k.startsWith(prefix) && val && val.view === true,
            );
        });

        if (!hasPerm) {
            return sendError(res, 403, 'Access denied: missing view permission for porter::trips or porter::orders');
        }
        return next();
    } catch (error) {
        return sendError(res, 500, `Internal authorization error: ${error.message}`);
    }
};

router.get('/health', (_req, res) => res.json({ success: true, module: 'porter', status: 'ok' }));

// Public vehicle catalog
router.get('/vehicles/public', listPublicVehicles);
router.get('/vehicle-types/public', listPublicVehicles);

// Zones
router.get('/admin/zones/dropdown', ...adminOrEmployee, checkPermission('porter::zones', 'view'), listZoneDropdown);
router.get('/admin/zones', ...adminOrEmployee, checkPermission('porter::zones', 'view'), listZones);
router.get('/admin/zones/:id', ...adminOrEmployee, checkPermission('porter::zones', 'view'), getZoneById);
router.post('/admin/zones', ...adminOrEmployee, checkPermission('porter::zones', 'create'), createZone);
router.put('/admin/zones/:id', ...adminOrEmployee, checkPermission('porter::zones', 'edit'), updateZone);
router.patch('/admin/zones/:id/status', ...adminOrEmployee, checkPermission('porter::zones', 'edit'), patchZoneStatus);
router.delete('/admin/zones/:id', ...adminOrEmployee, checkPermission('porter::zones', 'delete'), deleteZone);

// Vehicles
router.get('/admin/vehicles/dropdown', ...adminOrEmployee, checkPermission('porter::vehicles', 'view'), listVehicleDropdown);
router.get('/admin/vehicles', ...adminOrEmployee, checkPermission('porter::vehicles', 'view'), listVehicles);
router.get('/admin/vehicles/:id', ...adminOrEmployee, checkPermission('porter::vehicles', 'view'), getVehicleById);
router.post('/admin/vehicles', ...adminOrEmployee, checkPermission('porter::vehicles', 'create'), upload.single('icon'), createVehicle);
router.put('/admin/vehicles/:id', ...adminOrEmployee, checkPermission('porter::vehicles', 'edit'), upload.single('icon'), updateVehicle);
router.patch('/admin/vehicles/:id/status', ...adminOrEmployee, checkPermission('porter::vehicles', 'edit'), patchVehicleStatus);
router.post('/admin/vehicles/:id/icon', ...adminOrEmployee, checkPermission('porter::vehicles', 'edit'), upload.single('icon'), uploadVehicleIcon);
router.delete('/admin/vehicles/:id', ...adminOrEmployee, checkPermission('porter::vehicles', 'delete'), deleteVehicle);

// Pricing
router.get('/admin/pricing', ...adminOrEmployee, checkPermission('porter::pricing', 'view'), listPricing);
router.get('/admin/pricing/vehicle/:vehicleId', ...adminOrEmployee, checkPermission('porter::pricing', 'view'), getPricingByVehicleId);
router.get('/admin/pricing/:id', ...adminOrEmployee, checkPermission('porter::pricing', 'view'), getPricingById);
router.post('/admin/pricing', ...adminOrEmployee, checkPermission('porter::pricing', 'create'), createPricing);
router.put('/admin/pricing/:id', ...adminOrEmployee, checkPermission('porter::pricing', 'edit'), updatePricing);
router.put('/admin/pricing/vehicle/:vehicleId', ...adminOrEmployee, checkPermission('porter::pricing', 'edit'), upsertVehiclePricing);
router.patch('/admin/pricing/:id/status', ...adminOrEmployee, checkPermission('porter::pricing', 'edit'), patchPricingStatus);
router.delete('/admin/pricing/:id', ...adminOrEmployee, checkPermission('porter::pricing', 'delete'), deletePricing);
router.delete('/admin/pricing/vehicle/:vehicleId', ...adminOrEmployee, checkPermission('porter::pricing', 'delete'), clearVehiclePricing);

// Coupons
router.get('/admin/coupons/summary', ...adminOrEmployee, checkPermission('porter::coupons', 'view'), getCouponSummary);
router.get('/admin/coupons', ...adminOrEmployee, checkPermission('porter::coupons', 'view'), listCoupons);
router.get('/admin/coupons/:id', ...adminOrEmployee, checkPermission('porter::coupons', 'view'), getCouponById);
router.post('/admin/coupons', ...adminOrEmployee, checkPermission('porter::coupons', 'create'), createCoupon);
router.put('/admin/coupons/:id', ...adminOrEmployee, checkPermission('porter::coupons', 'edit'), updateCoupon);
router.patch('/admin/coupons/:id/status', ...adminOrEmployee, checkPermission('porter::coupons', 'edit'), patchCouponStatus);
router.delete('/admin/coupons/:id', ...adminOrEmployee, checkPermission('porter::coupons', 'delete'), deleteCoupon);

// Banners
router.get('/admin/banners/stats', ...adminOrEmployee, checkPermission('porter::banners', 'view'), getBannerStats);
router.get('/admin/banners', ...adminOrEmployee, checkPermission('porter::banners', 'view'), listBanners);
router.get('/admin/banners/:id', ...adminOrEmployee, checkPermission('porter::banners', 'view'), getBannerById);
router.post('/admin/banners', ...adminOrEmployee, checkPermission('porter::banners', 'create'), upload.single('image'), createBanner);
router.put('/admin/banners/:id', ...adminOrEmployee, checkPermission('porter::banners', 'edit'), upload.single('image'), updateBanner);
router.patch('/admin/banners/:id/status', ...adminOrEmployee, checkPermission('porter::banners', 'edit'), patchBannerStatus);
router.delete('/admin/banners/:id', ...adminOrEmployee, checkPermission('porter::banners', 'delete'), deleteBanner);

// Users (FoodUser listing)
router.get('/admin/users', ...adminOrEmployee, checkPermission('porter::users', 'view'), listPorterUsers);
router.get('/admin/users/:id', ...adminOrEmployee, checkPermission('porter::users', 'view'), getPorterUserById);
router.put('/admin/users/:id', ...adminOrEmployee, checkPermission('porter::users', 'edit'), updatePorterUser);
router.delete('/admin/users/:id', ...adminOrEmployee, checkPermission('porter::users', 'delete'), deletePorterUser);

// Admin: Trips
router.get('/admin/trips', ...adminOrEmployee, checkPorterTripView, listAdminTrips);
router.get('/admin/trips/:id', ...adminOrEmployee, checkPorterTripView, getAdminTripById);

// User: quote + trips
router.post('/quote', ...userOnly, quoteTrip);
router.post('/trips', ...userOnly, createTrip);
router.get('/trips', ...userOnly, listMyTrips);
router.get('/trips/:id', ...userOnly, getMyTripById);
router.post('/trips/:id/cancel', ...userOnly, cancelMyTrip);

// Partner: trip lifecycle
router.post('/partner/trips/:id/accept', ...partnerOnly, acceptTrip);
router.post('/partner/trips/:id/arrived', ...partnerOnly, markArrived);
router.post('/partner/trips/:id/start', ...partnerOnly, startTrip);
router.post('/partner/trips/:id/complete', ...partnerOnly, completeTrip);

export default router;
