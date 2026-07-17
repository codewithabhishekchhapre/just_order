/** Shared draft helpers + constants for Food Delivery rider onboarding */

export const VEHICLE_OPTIONS = [
  { id: "bike", label: "Bike", requiresRegistration: true, requiresDl: true, icon: "🏍️" },
  { id: "scooter", label: "Scooter", requiresRegistration: true, requiresDl: true, icon: "🛵" },
  { id: "bicycle", label: "Bicycle", requiresRegistration: false, requiresDl: false, icon: "🚲" },
]

export const DOC_KEYS = {
  profilePhoto: "Profile Photo",
  aadharFront: "Aadhaar Front",
  aadharBack: "Aadhaar Back",
  drivingLicenseFront: "Driving License Front",
  drivingLicenseBack: "Driving License Back",
  rcPhoto: "RC (Registration Certificate)",
  insurancePhoto: "Vehicle Insurance",
}

export const ALL_DOC_KEYS = Object.keys(DOC_KEYS)

export const emptySignupDetails = (overrides = {}) => ({
  name: "",
  phone: "",
  countryCode: "+91",
  ref: "",
  email: "",
  dateOfBirth: "",
  vehicleType: "",
  vehicleBrand: "",
  vehicleModel: "",
  vehicleNumber: "",
  drivingLicenseNumber: "",
  drivingLicenseExpiry: "",
  aadharNumber: "",
  bankAccountHolderName: "",
  bankAccountNumber: "",
  bankIfscCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  partnerAgreement: false,
  termsAccepted: false,
  privacyAccepted: false,
  ...overrides,
})

export const emptyUploadedDocs = () =>
  ALL_DOC_KEYS.reduce((acc, key) => {
    acc[key] = null
    return acc
  }, {})

const DB_NAME = "DeliverySignupDB"
const STORE_NAME = "documents"
let cachedDB = null

export const initDB = () =>
  new Promise((resolve) => {
    if (cachedDB) return resolve(cachedDB)
    if (typeof indexedDB === "undefined" || !indexedDB) return resolve(null)
    const timeoutId = setTimeout(() => resolve(null), 2000)
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = (e) => {
        clearTimeout(timeoutId)
        cachedDB = e.target.result
        resolve(cachedDB)
      }
      request.onerror = () => {
        clearTimeout(timeoutId)
        resolve(null)
      }
    } catch {
      clearTimeout(timeoutId)
      resolve(null)
    }
  })

export const saveFileToDB = async (key, file) => {
  const db = await initDB()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.objectStore(STORE_NAME).put(file, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export const getFileFromDB = async (key) => {
  const db = await initDB()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export const removeFileFromDB = async (key) => {
  const db = await initDB()
  if (!db) return
  try {
    db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key)
  } catch {
    /* ignore */
  }
}

export const clearSignupDB = async () => {
  const db = await initDB()
  if (!db) return
  try {
    db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear()
  } catch {
    /* ignore */
  }
}

export const loadSignupDetails = () => {
  try {
    const raw = sessionStorage.getItem("deliverySignupDetails")
    if (!raw) return null
    return { ...emptySignupDetails(), ...JSON.parse(raw) }
  } catch {
    return null
  }
}

export const saveSignupDetails = (details) => {
  sessionStorage.setItem("deliverySignupDetails", JSON.stringify(details))
}

export const isMotorizedVehicle = (vehicleType) =>
  vehicleType === "bike" || vehicleType === "scooter"

export const validateSignupDetails = (formData) => {
  const errors = {}
  const nameOk = /^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test((formData.name || "").trim()) ||
    /^[A-Za-z]{2,}$/.test((formData.name || "").trim())

  if (!formData.name?.trim()) errors.name = "Full name is required"
  else if (!nameOk) errors.name = "Name can contain letters only"

  if (formData.email?.trim()) {
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email.trim().toLowerCase())) {
      errors.email = "Enter a valid email address"
    }
  }

  if (!formData.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required"
  } else {
    const dob = new Date(formData.dateOfBirth)
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (Number.isNaN(dob.getTime()) || age < 18) errors.dateOfBirth = "You must be at least 18 years old"
  }

  const aadhaar = String(formData.aadharNumber || "").replace(/\s/g, "")
  if (!aadhaar) errors.aadharNumber = "Aadhaar number is required"
  else if (!/^\d{12}$/.test(aadhaar)) errors.aadharNumber = "Aadhaar must be 12 digits"

  if (!formData.vehicleType) errors.vehicleType = "Select a vehicle type"

  const motorized = isMotorizedVehicle(formData.vehicleType)

  if (motorized) {
    if (!formData.drivingLicenseNumber?.trim()) {
      errors.drivingLicenseNumber = "Driving license number is required"
    } else if (!/^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(formData.drivingLicenseNumber.trim().toUpperCase())) {
      errors.drivingLicenseNumber = "Invalid DL format (e.g., MH1220110012345)"
    }
    if (!formData.drivingLicenseExpiry) {
      errors.drivingLicenseExpiry = "License expiry date is required"
    } else if (new Date(formData.drivingLicenseExpiry).getTime() < Date.now()) {
      errors.drivingLicenseExpiry = "License must not be expired"
    }
    if (!formData.vehicleNumber?.trim()) {
      errors.vehicleNumber = "Vehicle number is required"
    } else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(formData.vehicleNumber.trim().toUpperCase())) {
      errors.vehicleNumber = "Invalid format (e.g., MH12AB1234)"
    }
    if (!formData.vehicleBrand?.trim()) {
      errors.vehicleBrand = "Vehicle brand is required"
    }
    if (!formData.vehicleModel?.trim()) {
      errors.vehicleModel = "Vehicle model is required"
    }
  }

  if (!formData.bankAccountHolderName?.trim()) errors.bankAccountHolderName = "Account holder name is required"
  if (!formData.bankAccountNumber?.trim()) errors.bankAccountNumber = "Account number is required"
  else if (!/^\d{9,18}$/.test(formData.bankAccountNumber.replace(/\s/g, ""))) {
    errors.bankAccountNumber = "Account number must be 9–18 digits"
  }
  if (!formData.bankIfscCode?.trim()) errors.bankIfscCode = "IFSC code is required"
  else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankIfscCode.trim().toUpperCase())) {
    errors.bankIfscCode = "Invalid IFSC (e.g., SBIN0001234)"
  }

  if (!formData.emergencyContactName?.trim()) errors.emergencyContactName = "Emergency contact name is required"
  const emergPhone = String(formData.emergencyContactPhone || "").replace(/\D/g, "")
  if (!emergPhone || emergPhone.length < 10) errors.emergencyContactPhone = "Valid mobile number is required"
  else if (emergPhone.slice(-10) === String(formData.phone || "").replace(/\D/g, "").slice(-10)) {
    errors.emergencyContactPhone = "Must be different from your mobile number"
  }

  if (!formData.partnerAgreement) errors.partnerAgreement = "Required"
  if (!formData.termsAccepted) errors.termsAccepted = "Required"
  if (!formData.privacyAccepted) errors.privacyAccepted = "Required"

  return errors
}
