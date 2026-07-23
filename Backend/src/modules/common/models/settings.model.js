import mongoose from "mongoose";

const vehicleDocumentRequirementSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: [
        "rc",
        "drivingLicense",
        "insurance",
        "puc",
        "vehiclePermit",
        "fitnessCertificate",
        "aadhaar",
        "pan",
        "profilePhoto",
        "bankDetails",
      ],
    },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const vehicleConfigurationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    icon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    documents: {
      type: [vehicleDocumentRequirementSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const globalSettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, default: "Appzeto" },
    email: { type: String, required: true, default: "admin@appzeto.com" },
    phone: {
      countryCode: { type: String, default: "+91" },
      number: { type: String, default: "" },
    },
    address: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    region: { type: String, default: "India" },
    adminLogo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    adminFavicon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    userLogo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    userFavicon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    deliveryLogo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    deliveryFavicon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    restaurantLogo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    restaurantFavicon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    sellerLogo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    sellerFavicon: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    loginBanner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    sellerLoginBanner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      active: { type: Boolean, default: true },
    },
    restaurantLoginBanner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      active: { type: Boolean, default: true },
    },
    themeColor: { type: String, default: "#0a0a0a" },
    modules: {
      food: { type: Boolean, default: true },
      quickCommerce: { type: Boolean, default: true },
      porter: { type: Boolean, default: true },
      taxi: { type: Boolean, default: true },
    },
    vehicleConfigurations: {
      type: [vehicleConfigurationSchema],
      default: [],
    },
    moduleVehicleMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// We keep the collection name the same if we want to preserve data,
// or rename it if we want a fresh start.
// Given the user wants to "move" them, keeping data is likely preferred.
export const GlobalSettings = mongoose.model(
  "GlobalSettings",
  globalSettingsSchema,
  "common_global_settings",
);
