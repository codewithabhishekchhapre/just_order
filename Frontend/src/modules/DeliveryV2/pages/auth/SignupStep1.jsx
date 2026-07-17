import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Bike } from "lucide-react"
import { toast } from "sonner"
import useDeliveryBackNavigation from "../../hooks/useDeliveryBackNavigation"
import {
  VEHICLE_OPTIONS,
  emptySignupDetails,
  loadSignupDetails,
  saveSignupDetails,
  validateSignupDetails,
  isMotorizedVehicle,
} from "../../utils/signupDraft"
import { DeliveryStepper, DeliveryPageHeader, DeliveryPrimaryButton } from "../../components/ui/deliveryUi"

const fieldClass = (hasError) =>
  `w-full min-h-[48px] px-4 py-3 text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-orange/30 ${
    hasError ? "border-red-500" : "border-gray-300"
  }`

export default function SignupStep1() {
  const navigate = useNavigate()
  const goBack = useDeliveryBackNavigation()
  const location = useLocation()
  const queryRef = new URLSearchParams(location.search).get("ref") || ""

  const [formData, setFormData] = useState(() => {
    const saved = loadSignupDetails()
    const authRaw = sessionStorage.getItem("deliveryAuthData")
    let phone = ""
    let countryCode = "+91"
    try {
      if (authRaw) {
        const auth = JSON.parse(authRaw)
        phone = String(auth.phone || "").replace(/\D/g, "").slice(-10)
        countryCode = auth.countryCode || "+91"
      }
    } catch {
      /* ignore */
    }
    return emptySignupDetails({
      ...(saved || {}),
      phone: saved?.phone || phone,
      countryCode: saved?.countryCode || countryCode,
      ref: saved?.ref || queryRef,
    })
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)

  const motorized = isMotorizedVehicle(formData.vehicleType)

  useEffect(() => {
    saveSignupDetails(formData)
  }, [formData])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInset(inset > 80 ? inset : 0)
    }
    vv.addEventListener("resize", onResize)
    vv.addEventListener("scroll", onResize)
    return () => {
      vv.removeEventListener("resize", onResize)
      vv.removeEventListener("scroll", onResize)
    }
  }, [])

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let next = type === "checkbox" ? checked : value

    if (name === "drivingLicenseNumber") {
      next = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)
    }
    if (name === "aadharNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 12)
      next = digits.replace(/(\d{4})(?=\d)/g, "$1 ")
    }
    if (name === "vehicleNumber") {
      next = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
    }
    if (name === "bankIfscCode") {
      next = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11)
    }
    if (name === "bankAccountNumber") {
      next = String(value).replace(/\D/g, "").slice(0, 18)
    }
    if (name === "emergencyContactPhone") {
      next = String(value).replace(/\D/g, "").slice(0, 10)
    }
    if (name === "email") {
      next = String(value).replace(/\s/g, "").toLowerCase()
    }
    if (name === "name" || name === "bankAccountHolderName" || name === "emergencyContactName") {
      next = String(value).replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ")
    }

    setField(name, next)
  }

  const handleVehicleSelect = (id) => {
    setFormData((prev) => ({
      ...prev,
      vehicleType: id,
      ...(id === "bicycle"
        ? { vehicleNumber: "", drivingLicenseNumber: "", drivingLicenseExpiry: "" }
        : {}),
    }))
    if (errors.vehicleType) setErrors((prev) => ({ ...prev, vehicleType: "" }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateSignupDetails(formData)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error("Please fill all required fields correctly")
      const firstKey = Object.keys(nextErrors)[0]
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    setIsSubmitting(true)
    try {
      const details = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email?.trim() || "",
        aadharNumber: formData.aadharNumber.replace(/\s/g, ""),
        drivingLicenseNumber: formData.drivingLicenseNumber.trim().toUpperCase(),
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        vehicleBrand: formData.vehicleBrand.trim(),
        vehicleModel: formData.vehicleModel.trim(),
        bankIfscCode: formData.bankIfscCode.trim().toUpperCase(),
        bankAccountNumber: formData.bankAccountNumber.replace(/\s/g, ""),
        bankAccountHolderName: formData.bankAccountHolderName.trim(),
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.replace(/\D/g, "").slice(0, 10),
        phone: String(formData.phone || "").replace(/\D/g, "").slice(0, 15),
      }
      saveSignupDetails(details)
      toast.success("Details saved")
      navigate("/food/delivery/signup/documents")
    } catch {
      toast.error("Failed to save. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const rejectionReason = sessionStorage.getItem("deliveryRejectionReason")
  const documentsRequested = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("deliveryDocumentsRequested") || "[]")
    } catch {
      return []
    }
  })()

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col"
      style={{ paddingBottom: keyboardInset ? keyboardInset + 16 : undefined }}
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-3 sm:px-4 py-3 flex items-center gap-3 border-b border-slate-200 safe-area-top">
        <button
          type="button"
          onClick={goBack}
          className="p-2 -ml-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Partner Onboarding</h1>
          <p className="text-xs text-gray-500 truncate">Step 1 of 2 · Personal & vehicle details</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <DeliveryStepper step={1} />

        {(rejectionReason || documentsRequested.length > 0) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            {rejectionReason && <p className="font-medium">{rejectionReason}</p>}
            {documentsRequested.length > 0 && (
              <p className="mt-1 text-xs">Re-upload required: {documentsRequested.join(", ")}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Personal information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input name="name" value={formData.name} onChange={handleChange} className={fieldClass(errors.name)} placeholder="As on Aadhaar" autoComplete="name" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
              <input
                value={`${formData.countryCode} ${formData.phone}`}
                disabled
                className="w-full min-h-[48px] px-4 py-3 text-base border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-400 mt-1">Verified via OTP</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className={fieldClass(errors.email)} placeholder="you@example.com" autoComplete="email" inputMode="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)} className={fieldClass(errors.dateOfBirth)} />
              {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Identity</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhaar number <span className="text-red-500">*</span>
              </label>
              <input name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} className={fieldClass(errors.aadharNumber)} placeholder="XXXX XXXX XXXX" inputMode="numeric" />
              {errors.aadharNumber && <p className="text-red-500 text-xs mt-1">{errors.aadharNumber}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Vehicle</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {VEHICLE_OPTIONS.map((v) => {
                const selected = formData.vehicleType === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVehicleSelect(v.id)}
                    className={`flex flex-col items-center justify-center gap-1 min-h-[88px] rounded-xl border-2 px-2 py-3 transition-all ${
                      selected
                        ? "border-primary-orange bg-orange-50 text-orange-800"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>{v.icon}</span>
                    <span className="text-xs sm:text-sm font-semibold">{v.label}</span>
                    {selected && <Bike className="w-3.5 h-3.5 text-primary-orange" />}
                  </button>
                )
              })}
            </div>
            {errors.vehicleType && <p className="text-red-500 text-xs">{errors.vehicleType}</p>}

            {motorized && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle brand <span className="text-red-500">*</span>
                  </label>
                  <input name="vehicleBrand" value={formData.vehicleBrand} onChange={handleChange} className={fieldClass(errors.vehicleBrand)} placeholder="e.g. Honda" />
                  {errors.vehicleBrand && <p className="text-red-500 text-xs mt-1">{errors.vehicleBrand}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle model <span className="text-red-500">*</span>
                  </label>
                  <input name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} className={fieldClass(errors.vehicleModel)} placeholder="e.g. Activa 6G" />
                  {errors.vehicleModel && <p className="text-red-500 text-xs mt-1">{errors.vehicleModel}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle number <span className="text-red-500">*</span>
                  </label>
                  <input name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} className={fieldClass(errors.vehicleNumber)} placeholder="MH12AB1234" />
                  {errors.vehicleNumber && <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driving license number <span className="text-red-500">*</span>
                  </label>
                  <input name="drivingLicenseNumber" value={formData.drivingLicenseNumber} onChange={handleChange} className={fieldClass(errors.drivingLicenseNumber)} placeholder="MH1220110012345" />
                  {errors.drivingLicenseNumber && <p className="text-red-500 text-xs mt-1">{errors.drivingLicenseNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License expiry <span className="text-red-500">*</span>
                  </label>
                  <input name="drivingLicenseExpiry" type="date" value={formData.drivingLicenseExpiry} onChange={handleChange} min={new Date().toISOString().slice(0, 10)} className={fieldClass(errors.drivingLicenseExpiry)} />
                  {errors.drivingLicenseExpiry && <p className="text-red-500 text-xs mt-1">{errors.drivingLicenseExpiry}</p>}
                </div>
              </>
            )}

            {formData.vehicleType === "bicycle" && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Bicycle partners do not need RC, insurance, or a driving license.
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Bank details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account holder name <span className="text-red-500">*</span>
              </label>
              <input name="bankAccountHolderName" value={formData.bankAccountHolderName} onChange={handleChange} className={fieldClass(errors.bankAccountHolderName)} placeholder="Name as in bank account" />
              {errors.bankAccountHolderName && <p className="text-red-500 text-xs mt-1">{errors.bankAccountHolderName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account number <span className="text-red-500">*</span>
              </label>
              <input name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={fieldClass(errors.bankAccountNumber)} placeholder="9–18 digit account number" inputMode="numeric" />
              {errors.bankAccountNumber && <p className="text-red-500 text-xs mt-1">{errors.bankAccountNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC code <span className="text-red-500">*</span>
              </label>
              <input name="bankIfscCode" value={formData.bankIfscCode} onChange={handleChange} className={fieldClass(errors.bankIfscCode)} placeholder="SBIN0001234" />
              {errors.bankIfscCode && <p className="text-red-500 text-xs mt-1">{errors.bankIfscCode}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Emergency contact</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={fieldClass(errors.emergencyContactName)} placeholder="Contact person name" />
              {errors.emergencyContactName && <p className="text-red-500 text-xs mt-1">{errors.emergencyContactName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile number <span className="text-red-500">*</span>
              </label>
              <input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className={fieldClass(errors.emergencyContactPhone)} placeholder="10-digit mobile" inputMode="tel" />
              {errors.emergencyContactPhone && <p className="text-red-500 text-xs mt-1">{errors.emergencyContactPhone}</p>}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-3 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Agreements</h2>
            {[
              { name: "partnerAgreement", label: "I agree to the Driver Partner Agreement" },
              { name: "termsAccepted", label: "I accept the Terms & Conditions" },
              { name: "privacyAccepted", label: "I accept the Privacy Policy" },
            ].map((item) => (
              <label key={item.name} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name={item.name}
                  checked={!!formData[item.name]}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-orange focus:ring-primary-orange/30 shrink-0"
                />
                <span className="text-sm text-gray-700 leading-snug">
                  {item.label} <span className="text-red-500">*</span>
                  {errors[item.name] && <span className="block text-red-500 text-xs mt-0.5">{errors[item.name]}</span>}
                </span>
              </label>
            ))}
          </section>

          <div className="h-20" />
        </form>
      </main>

      <div
        className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-3 sm:px-4 py-3 safe-area-bottom"
        style={{ paddingBottom: keyboardInset ? 12 : undefined }}
      >
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full min-h-[52px] rounded-xl bg-primary-orange text-white font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] transition"
          >
            {isSubmitting ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
