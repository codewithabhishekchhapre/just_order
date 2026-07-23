/**
 * Shared submit helpers for the Food Delivery rider onboarding flow.
 * Used by SignupStep2 (documents) and SignupStepReview (final submit).
 */
import {
  buildModuleSelectionsPayload,
  clearSignupDB,
  normalizeAadhaar,
} from "./signupDraft";

export const hasBinaryUpload = (value) =>
  (typeof File !== "undefined" && value instanceof File) ||
  (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0);

export const toUploadFile = (value, key = "upload") => {
  if (!value) return null;
  if (typeof File !== "undefined" && value instanceof File) return value;
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    const type = value.type || "image/jpeg";
    const ext = type.includes("png")
      ? "png"
      : type.includes("webp")
        ? "webp"
        : "jpg";
    return new File([value], `${key}.${ext}`, { type });
  }
  return null;
};

/**
 * A document counts as "present" when we hold a real binary locally, or the
 * server already has it (non-blob URL string / `{ url }` marker) — the latter
 * matters for resubmission where unchanged documents stay on the server.
 */
export const hasDocumentValue = (localFile, uploadedValue) => {
  if (hasBinaryUpload(localFile)) return true;
  if (
    typeof uploadedValue === "string" &&
    uploadedValue.trim() &&
    !uploadedValue.startsWith("blob:")
  ) {
    return true;
  }
  if (
    uploadedValue &&
    typeof uploadedValue === "object" &&
    typeof uploadedValue.url === "string"
  ) {
    const url = uploadedValue.url.trim();
    return Boolean(url) && !url.startsWith("blob:");
  }
  return false;
};

/**
 * Field-level required-document errors for the documents step.
 * Reuses hasDocumentValue (same presence rules as submit).
 *
 * @param {{
 *   requiredFields?: string[],
 *   documents?: Record<string, unknown>,
 *   uploadedDocs?: Record<string, unknown>,
 *   labels?: Record<string, string>,
 * }} args
 * @returns {Record<string, string>}
 */
export const validateDocumentsStep = ({
  requiredFields = [],
  documents = {},
  uploadedDocs = {},
  labels = {},
} = {}) => {
  const errors = {};
  for (const field of requiredFields) {
    if (!hasDocumentValue(documents[field], uploadedDocs[field])) {
      const label = labels[field] || field;
      errors[field] = `${label} is required`;
    }
  }
  return errors;
};

export const getFriendlyRegistrationError = (error) => {
  const rawMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "";

  if (/E11000 duplicate key error/i.test(rawMessage)) {
    if (/vehicleNumber/i.test(rawMessage))
      return "This vehicle number is already registered.";
    if (/aadharNumber/i.test(rawMessage))
      return "This Aadhaar number is already registered.";
    if (/drivingLicense/i.test(rawMessage))
      return "This driving license is already registered.";
    if (/phone/i.test(rawMessage))
      return "This mobile number is already registered.";
    return "This account detail is already registered.";
  }
  return rawMessage || "Failed to register. Please try again.";
};

export const appendFcm = async (formData) => {
  let fcmToken = null;
  let platform = "web";
  try {
    if (typeof window !== "undefined") {
      if (window.flutter_inappwebview) {
        platform = "mobile";
        for (const handlerName of [
          "getFcmToken",
          "getFCMToken",
          "getPushToken",
          "getFirebaseToken",
        ]) {
          try {
            const t = await Promise.race([
              window.flutter_inappwebview.callHandler(handlerName, {
                module: "delivery",
              }),
              new Promise((resolve) => setTimeout(() => resolve(null), 800)),
            ]);
            if (t && typeof t === "string" && t.length > 20) {
              fcmToken = t.trim();
              break;
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        fcmToken =
          localStorage.getItem("fcm_web_registered_token_delivery") || null;
      }
    }
  } catch {
    /* ignore */
  }
  if (fcmToken) {
    formData.append("fcmToken", fcmToken);
    formData.append("platform", platform);
  }
};

export const buildRegistrationFormData = async (
  details,
  documents,
  { partial = false } = {},
) => {
  const formData = new FormData();
  if (partial) {
    formData.append(
      "phone",
      String(details.phone || "")
        .replace(/\D/g, "")
        .slice(0, 15),
    );
    if (details.countryCode)
      formData.append("countryCode", details.countryCode);
    const resubmitToken = sessionStorage.getItem("deliveryDocsResubmitToken");
    if (resubmitToken) formData.append("docsResubmitToken", resubmitToken);
  } else {
    const fields = [
      "name",
      "phone",
      "email",
      "countryCode",
      "ref",
      "dateOfBirth",
      "address",
      "city",
      "state",
      "panNumber",
      "vehicleType",
      "vehicleNumber",
      "vehicleBrand",
      "vehicleModel",
      "drivingLicenseNumber",
      "drivingLicenseExpiry",
      "aadharNumber",
      "bankAccountHolderName",
      "bankAccountNumber",
      "bankIfscCode",
      "bankName",
      "emergencyContactName",
      "emergencyContactPhone",
    ];
    fields.forEach((key) => {
      const val = details[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        let out = String(val).trim();
        if (key === "aadharNumber") out = normalizeAadhaar(out);
        if (key === "phone" || key === "emergencyContactPhone") {
          out = out.replace(/\D/g, "").slice(0, 15);
        }
        if (key === "panNumber") out = out.toUpperCase();
        if (key === "bankIfscCode" || key === "drivingLicenseNumber") {
          out = out.toUpperCase();
        }
        if (key === "vehicleNumber") out = out.toUpperCase();
        if (out) formData.append(key, out);
      }
    });
    formData.append(
      "partnerAgreement",
      details.partnerAgreement ? "true" : "false",
    );
    formData.append("termsAccepted", details.termsAccepted ? "true" : "false");
    formData.append(
      "privacyAccepted",
      details.privacyAccepted ? "true" : "false",
    );

    const moduleSelections = buildModuleSelectionsPayload(details);
    if (moduleSelections.length) {
      formData.append("moduleSelections", JSON.stringify(moduleSelections));
      formData.append(
        "modules",
        moduleSelections.map((item) => item.module).join(","),
      );
      const primaryVehicleId = moduleSelections[0]?.vehicleConfigurationId;
      if (primaryVehicleId) {
        formData.append("vehicleConfigurationId", primaryVehicleId);
      }
    }
  }

  Object.keys(documents).forEach((key) => {
    const file = toUploadFile(documents[key], key);
    if (file) {
      formData.append(key, file);
    }
  });

  await appendFcm(formData);
  return formData;
};

export const clearSignupSession = () => {
  [
    "deliverySignupDetails",
    "deliverySignupDocs",
    "deliveryIsRejected",
    "deliveryPaymentSuccessData",
    "deliveryRejectionReason",
    "deliveryDocumentsRequested",
    "deliveryDocsResubmitToken",
    "deliveryDocumentsRequired",
    "deliveryResubmitModules",
    "deliveryHighlightedFields",
    "deliveryNeedsRegistration",
    "deliveryOnboardingPhone",
    "deliveryAuthData",
  ].forEach((k) => sessionStorage.removeItem(k));
  clearSignupDB();
};

/**
 * Wipe client onboarding state when the authenticated mobile number changes.
 * Auth tokens are handled separately by the caller.
 */
export const resetOnboardingClientStateForPhone = (phone) => {
  const digits = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  const previous = sessionStorage.getItem("deliveryOnboardingPhone") || "";
  if (previous && digits && previous !== digits) {
    clearSignupSession();
  } else if (!digits) {
    clearSignupSession();
  }
  if (digits) {
    sessionStorage.setItem("deliveryOnboardingPhone", digits);
  }
  return digits;
};

export const getCachedOnboardingPhone = () =>
  String(sessionStorage.getItem("deliveryOnboardingPhone") || "")
    .replace(/\D/g, "")
    .slice(-10);
