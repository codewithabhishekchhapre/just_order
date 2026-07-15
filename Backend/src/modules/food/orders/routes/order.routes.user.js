import express from 'express';
import {
    calculateOrderController,
    createOrderController,
    verifyPaymentController,
    retryOnlinePaymentController,
    markOnlinePaymentFailedController,
    listOrdersUserController,
    getOrderPaymentsUserController,
    getOrderByIdUserController,
    cancelOrderController,
    submitOrderRatingsController,
    getOrderDropOtpUserController,
    updateOrderInstructionsController
} from '../controllers/order.controller.js';
import { sensitiveActionRateLimiter } from '../../../../middleware/rateLimit.js';

const router = express.Router();

router.post('/calculate', sensitiveActionRateLimiter, calculateOrderController);
router.post('/', sensitiveActionRateLimiter, createOrderController);
router.post('/verify-payment', sensitiveActionRateLimiter, verifyPaymentController);
router.post('/:orderId/retry-payment', sensitiveActionRateLimiter, retryOnlinePaymentController);
router.patch('/:orderId/payment-failed', sensitiveActionRateLimiter, markOnlinePaymentFailedController);
router.get('/', listOrdersUserController);
router.get('/:orderId/payments', getOrderPaymentsUserController);
router.get('/:orderId/drop-otp', getOrderDropOtpUserController);
router.get('/:orderId', getOrderByIdUserController);
router.patch('/:orderId/cancel', cancelOrderController);
router.patch('/:orderId/ratings', submitOrderRatingsController);
router.patch('/:orderId/instructions', updateOrderInstructionsController);

export default router;
