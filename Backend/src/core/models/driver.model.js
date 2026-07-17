import mongoose from 'mongoose';
import { actionPerformerSchema } from './actionPerformer.schema.js';

const normalizeRatingValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(5, Number(numeric.toFixed(1))));
};

const driverSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        email: { type: String, trim: true },
        countryCode: {
            type: String,
            default: '+91'
        },
        address: {
            type: String
        },
        city: {
            type: String
        },
        state: {
            type: String
        },
        dateOfBirth: {
            type: Date
        },
        vehicleType: {
            type: String
        },
        vehicleBrand: {
            type: String
        },
        vehicleModel: {
            type: String
        },
        vehicleName: {
            type: String
        },
        vehicleNumber: {
            type: String,
            unique: true,
            sparse: true
        },
        panNumber: {
            type: String
        },
        aadharNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        drivingLicenseNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        drivingLicenseExpiry: {
            type: Date
        },
        profilePhoto: {
            type: String
        },
        fcmTokens: {
            type: [String],
            default: []
        },
        fcmTokenMobile: {
            type: [String],
            default: []
        },
        aadharPhoto: {
            type: String
        },
        aadharFront: {
            type: String
        },
        aadharBack: {
            type: String
        },
        panPhoto: {
            type: String
        },
        drivingLicensePhoto: {
            type: String
        },
        drivingLicenseFront: {
            type: String
        },
        drivingLicenseBack: {
            type: String
        },
        rcPhoto: {
            type: String
        },
        insurancePhoto: {
            type: String
        },
        vehicleImage: {
            type: String
        },
        emergencyContactName: {
            type: String,
            trim: true
        },
        emergencyContactPhone: {
            type: String,
            trim: true
        },
        agreements: {
            partnerAgreement: { type: Boolean, default: false },
            termsAccepted: { type: Boolean, default: false },
            privacyAccepted: { type: Boolean, default: false },
            acceptedAt: { type: Date }
        },
        documentsRequested: {
            type: [String],
            default: []
        },
        onboardingStep: {
            type: String,
            enum: ['details', 'documents', 'submitted']
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'documents_required'],
            default: 'pending'
        },
        isActive: {
            type: Boolean,
            default: false,
            index: true
        },
        rejectionReason: { type: String },
        rejectedAt: { type: Date },
        approvedAt: { type: Date },
        approvedBy: { type: actionPerformerSchema, default: null },
        rejectedBy: { type: actionPerformerSchema, default: null },
        bankAccountHolderName: { type: String },
        bankAccountNumber: { type: String },
        bankIfscCode: { type: String },
        bankName: { type: String },
        upiId: { type: String },
        upiQrCode: { type: String },
        availabilityStatus: {
            type: String,
            enum: ['online', 'offline'],
            default: 'offline'
        },
        lastLocation: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] }
        },
        lastLat: { type: Number },
        lastLng: { type: Number },
        lastLocationAt: { type: Date },
        referralCode: { type: String, index: true },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Driver',
            default: null,
            index: true
        },
        referralCount: { type: Number, default: 0, min: 0 },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
            set: normalizeRatingValue
        },
        totalRatings: { type: Number, default: 0, min: 0 },
        isDeleted: {
            type: Boolean,
            default: false
        },
        accountStatus: {
            type: String,
            enum: ['active', 'deleted'],
            default: 'active'
        },
        registeredServices: {
            food: {
                status: { type: String, enum: ['not_registered', 'pending', 'approved', 'rejected'], default: 'not_registered' },
                appliedAt: { type: Date },
                approvedAt: { type: Date },
                rejectedAt: { type: Date },
                rejectionReason: { type: String }
            },
            'quick-commerce': {
                status: { type: String, enum: ['not_registered', 'pending', 'approved', 'rejected'], default: 'not_registered' },
                appliedAt: { type: Date },
                approvedAt: { type: Date },
                rejectedAt: { type: Date },
                rejectionReason: { type: String }
            },
            taxi: {
                status: { type: String, enum: ['not_registered', 'pending', 'approved', 'rejected'], default: 'not_registered' },
                appliedAt: { type: Date },
                approvedAt: { type: Date },
                rejectedAt: { type: Date },
                rejectionReason: { type: String }
            },
            porter: {
                status: { type: String, enum: ['not_registered', 'pending', 'approved', 'rejected'], default: 'not_registered' },
                appliedAt: { type: Date },
                approvedAt: { type: Date },
                rejectedAt: { type: Date },
                rejectionReason: { type: String }
            },
            parcel: {
                status: { type: String, enum: ['not_registered', 'pending', 'approved', 'rejected'], default: 'not_registered' },
                appliedAt: { type: Date },
                approvedAt: { type: Date },
                rejectedAt: { type: Date },
                rejectionReason: { type: String }
            }
        },
        authorizedServices: {
            type: [String],
            enum: ['food', 'quick-commerce', 'porter', 'parcel', 'taxi'],
            default: ['food', 'quick-commerce']
        }
    },
    {
        collection: 'food_delivery_partners',
        timestamps: true
    }
);

// Indices
driverSchema.index({ lastLocation: '2dsphere' });

export const Driver = mongoose.model('Driver', driverSchema, 'food_delivery_partners');
