import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, X, Check, Camera, Image as ImageIcon } from "lucide-react"
import { deliveryAPI, onboardingFeeAPI } from "@food/api"
import { toast } from "sonner"
import { initRazorpayPayment } from "@food/utils/razorpay"
import { openCamera, openGallery } from "@food/utils/imageUploadUtils"
import useDeliveryBackNavigation from "../../hooks/useDeliveryBackNavigation"
import {
  DOC_KEYS,
  ALL_DOC_KEYS,
  emptyUploadedDocs,
  loadSignupDetails,
  saveFileToDB,
  getFileFromDB,
  removeFileFromDB,
  clearSignupDB,
  isMotorizedVehicle,
} from "../../utils/signupDraft"
import { DeliveryStepper } from "../../components/ui/deliveryUi"

const hasBinaryUpload = (value) =>
  (typeof File !== "undefined" && value instanceof File) ||
  (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0)

const toUploadFile = (value, key = "upload") => {
  if (!value) return null
  if (typeof File !== "undefined" && value instanceof File) return value
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    const type = value.type || "image/jpeg"
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg"
    return new File([value], `${key}.${ext}`, { type })
  }
  return null
}

const hasDocumentValue = (localFile, uploadedValue) => {
  // Only real binary counts for submit readiness (markers alone are not enough)
  if (hasBinaryUpload(localFile)) return true
  if (typeof uploadedValue === "string" && uploadedValue.trim() && !uploadedValue.startsWith("blob:")) {
    return true
  }
  if (uploadedValue && typeof uploadedValue === "object" && typeof uploadedValue.url === "string") {
    const url = uploadedValue.url.trim()
    return Boolean(url) && !url.startsWith("blob:")
  }
  return false
}

const getFriendlyRegistrationError = (error) => {
  const rawMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    ""

  if (/E11000 duplicate key error/i.test(rawMessage)) {
    if (/vehicleNumber/i.test(rawMessage)) return "This vehicle number is already registered."
    if (/aadharNumber/i.test(rawMessage)) return "This Aadhaar number is already registered."
    if (/drivingLicense/i.test(rawMessage)) return "This driving license is already registered."
    if (/phone/i.test(rawMessage)) return "This mobile number is already registered."
    return "This account detail is already registered."
  }
  return rawMessage || "Failed to register. Please try again."
}

const appendFcm = async (formData) => {
  let fcmToken = null
  let platform = "web"
  try {
    if (typeof window !== "undefined") {
      if (window.flutter_inappwebview) {
        platform = "mobile"
        for (const handlerName of ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"]) {
          try {
            const t = await Promise.race([
              window.flutter_inappwebview.callHandler(handlerName, { module: "delivery" }),
              new Promise((resolve) => setTimeout(() => resolve(null), 800)),
            ])
            if (t && typeof t === "string" && t.length > 20) {
              fcmToken = t.trim()
              break
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        fcmToken = localStorage.getItem("fcm_web_registered_token_delivery") || null
      }
    }
  } catch {
    /* ignore */
  }
  if (fcmToken) {
    formData.append("fcmToken", fcmToken)
    formData.append("platform", platform)
  }
}

const buildFormData = async (details, documents, { partial = false } = {}) => {
  const formData = new FormData()
  if (partial) {
    formData.append("phone", String(details.phone || "").replace(/\D/g, "").slice(0, 15))
    if (details.countryCode) formData.append("countryCode", details.countryCode)
    const resubmitToken = sessionStorage.getItem("deliveryDocsResubmitToken")
    if (resubmitToken) formData.append("docsResubmitToken", resubmitToken)
  } else {
    const fields = [
      "name", "phone", "email", "countryCode", "ref", "dateOfBirth",
      "vehicleType", "vehicleNumber", "vehicleBrand", "vehicleModel", "drivingLicenseNumber", "drivingLicenseExpiry",
      "aadharNumber", "bankAccountHolderName", "bankAccountNumber", "bankIfscCode",
      "emergencyContactName", "emergencyContactPhone",
    ]
    fields.forEach((key) => {
      const val = details[key]
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        formData.append(key, String(val).trim())
      }
    })
    formData.append("partnerAgreement", details.partnerAgreement ? "true" : "false")
    formData.append("termsAccepted", details.termsAccepted ? "true" : "false")
    formData.append("privacyAccepted", details.privacyAccepted ? "true" : "false")
  }

  Object.keys(documents).forEach((key) => {
    const file = toUploadFile(documents[key], key)
    if (file) {
      formData.append(key, file)
    }
  })

  await appendFcm(formData)
  return formData
}

const clearSignupSession = () => {
  ;[
    "deliverySignupDetails",
    "deliverySignupDocs",
    "deliveryIsRejected",
    "deliveryPaymentSuccessData",
    "deliveryRejectionReason",
    "deliveryDocumentsRequested",
    "deliveryDocsResubmitToken",
    "deliveryDocumentsRequired",
  ].forEach((k) => sessionStorage.removeItem(k))
  clearSignupDB()
}

const submitRegistration = async ({ useRegister, formData, navigate, phoneDisplay }) => {
  const response = useRegister
    ? await deliveryAPI.register(formData)
    : await deliveryAPI.completeProfile(formData)

  if (response?.data?.success) {
    clearSignupSession()
    sessionStorage.setItem("deliveryPendingPhone", phoneDisplay)
    sessionStorage.removeItem("deliveryNeedsRegistration")
    toast.success("Submitted. Verification is in progress.")
    setTimeout(
      () => navigate("/food/delivery/verification", { replace: true, state: { phone: phoneDisplay } }),
      800
    )
    return true
  }

  throw new Error(
    response?.data?.message || response?.data?.error || "Registration failed. Please try again."
  )
}

function DocumentUpload({ docType, label, file, uploaded, onCamera, onGallery, onRemove, restoring }) {
  const binary = toUploadFile(file, docType)
  const preview =
    (typeof uploaded === "string" && uploaded) ||
    uploaded?.url ||
    (binary
      ? binary._previewUrl || (binary._previewUrl = URL.createObjectURL(binary))
      : null)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
        {preview && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
            <Check className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="w-full h-40 sm:h-48 object-cover" />
          <button
            type="button"
            onClick={() => onRemove(docType)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"
            aria-label={`Remove ${label}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center min-h-[140px] bg-gray-50 border-t border-dashed border-gray-200">
          {restoring ? (
            <p className="text-sm text-gray-500">Restoring…</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => onCamera(docType, label)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-primary-orange text-white text-sm font-medium active:scale-95"
              >
                <Camera className="w-4 h-4" /> Take photo
              </button>
              <button
                type="button"
                onClick={() => onGallery(docType)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium active:scale-95"
              >
                <ImageIcon className="w-4 h-4" /> Gallery
              </button>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">JPG, PNG, WEBP · max 5MB</p>
        </div>
      )}
    </div>
  )
}

export default function SignupStep2() {
  const navigate = useNavigate()
  const goBack = useDeliveryBackNavigation()
  const submitLock = useRef(false)

  const signupDetails = useMemo(() => loadSignupDetails() || {}, [])
  const motorized = isMotorizedVehicle(signupDetails.vehicleType)

  const documentsRequested = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("deliveryDocumentsRequested") || "[]")
    } catch {
      return []
    }
  }, [])

  const requiredDocs = useMemo(() => {
    if (documentsRequested.length > 0) {
      return documentsRequested.filter((k) => ALL_DOC_KEYS.includes(k))
    }
    const base = ["profilePhoto", "aadharFront", "aadharBack"]
    if (motorized) {
      return [...base, "drivingLicenseFront", "drivingLicenseBack", "rcPhoto", "insurancePhoto"]
    }
    return base
  }, [documentsRequested, motorized])

  const [documents, setDocuments] = useState(() =>
    ALL_DOC_KEYS.reduce((acc, k) => ({ ...acc, [k]: null }), {})
  )
  const [uploadedDocs, setUploadedDocs] = useState(() => {
    try {
      const saved = sessionStorage.getItem("deliverySignupDocs")
      return saved ? { ...emptyUploadedDocs(), ...JSON.parse(saved) } : emptyUploadedDocs()
    } catch {
      return emptyUploadedDocs()
    }
  })
  const [restoring, setRestoring] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feeConfig, setFeeConfig] = useState(null)
  const [paymentSuccessData, setPaymentSuccessData] = useState(() => {
    try {
      const saved = sessionStorage.getItem("deliveryPaymentSuccessData")
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [keyboardInset, setKeyboardInset] = useState(0)

  const documentsRef = useRef(documents)
  useEffect(() => {
    documentsRef.current = documents
  }, [documents])

  useEffect(() => {
    const hasPhone = Boolean(signupDetails?.phone)
    const hasPartialDocs = (() => {
      try {
        const docs = JSON.parse(sessionStorage.getItem("deliveryDocumentsRequested") || "[]")
        return Array.isArray(docs) && docs.length > 0
      } catch {
        return false
      }
    })()
    if (!hasPhone && !hasPartialDocs) {
      toast.error("Session expired. Please start again.")
      navigate("/food/delivery/login", { replace: true })
    }
  }, [signupDetails, navigate])

  const isPartialReupload = documentsRequested.length > 0

  // For partial re-upload we only need phone on the draft
  useEffect(() => {
    if (!isPartialReupload) return
    if (signupDetails?.phone) return
    // ensure phone exists from auth if possible
    try {
      const authRaw = sessionStorage.getItem("deliveryAuthData")
      if (authRaw) {
        const auth = JSON.parse(authRaw)
        const phone = String(auth.phone || "").replace(/\D/g, "").slice(-10)
        if (phone) {
          sessionStorage.setItem(
            "deliverySignupDetails",
            JSON.stringify({ phone, countryCode: "+91", name: "" })
          )
        }
      }
    } catch {
      /* ignore */
    }
  }, [isPartialReupload, signupDetails?.phone])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const restored = {}
      const markers = { ...uploadedDocs }
      for (const key of requiredDocs) {
        const raw = await getFileFromDB(key)
        const file = toUploadFile(raw, key)
        if (file) {
          restored[key] = file
          markers[key] = { file: true }
        } else if (markers[key]?.file === true) {
          // Stale marker without binary — force re-select
          markers[key] = null
        }
      }
      if (!cancelled) {
        if (Object.keys(restored).length) {
          setDocuments((prev) => ({ ...prev, ...restored }))
          setUploadedDocs(markers)
        }
        setRestoring(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sessionStorage.setItem("deliverySignupDocs", JSON.stringify(uploadedDocs))
  }, [uploadedDocs])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const onResize = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInset(inset > 80 ? inset : 0)
    }
    vv.addEventListener("resize", onResize)
    return () => vv.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    const fetchFees = async () => {
      try {
        if (sessionStorage.getItem("deliveryIsRejected") === "true") {
          setFeeConfig(null)
          return
        }
        const res = await onboardingFeeAPI.getPublicFees()
        const fees = res?.data?.data || res?.data
        if (fees?.DELIVERY_PARTNER) setFeeConfig(fees.DELIVERY_PARTNER)
      } catch {
        /* ignore */
      }
    }
    fetchFees()
  }, [])

  useEffect(() => {
    return () => {
      Object.values(documentsRef.current).forEach((file) => {
        if (file instanceof File && file._previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(file._previewUrl)
        }
      })
    }
  }, [])

  const handleFileSelect = async (docType, file) => {
    if (!file) return
    const normalized = toUploadFile(file, docType)
    if (!normalized) {
      toast.error("Please select an image file")
      return
    }
    if (!normalized.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (normalized.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }
    setDocuments((prev) => {
      const old = prev[docType]
      if (old?._previewUrl) URL.revokeObjectURL(old._previewUrl)
      return { ...prev, [docType]: normalized }
    })
    setUploadedDocs((prev) => ({ ...prev, [docType]: { file: true } }))
    await saveFileToDB(docType, normalized)
    toast.success(`${DOC_KEYS[docType] || docType} selected`)
  }

  const handleRemove = (docType) => {
    setDocuments((prev) => {
      const file = prev[docType]
      if (file?._previewUrl) URL.revokeObjectURL(file._previewUrl)
      return { ...prev, [docType]: null }
    })
    setUploadedDocs((prev) => ({ ...prev, [docType]: null }))
    removeFileFromDB(docType)
  }

  const isFormValid = () =>
    requiredDocs.every((key) => hasBinaryUpload(documents[key]))

  const runSubmit = async (extraPayment = null) => {
    if (submitLock.current) return
    // Prefer live state over ref so freshly selected images are always included
    const liveDocs = { ...documentsRef.current, ...documents }
    documentsRef.current = liveDocs
    const missing = requiredDocs.filter((key) => !hasBinaryUpload(liveDocs[key]))
    if (missing.length) {
      toast.error(`Please re-select: ${missing.map((k) => DOC_KEYS[k] || k).join(", ")}`)
      setUploadedDocs((prev) => {
        const next = { ...prev }
        missing.forEach((k) => {
          next[k] = null
        })
        return next
      })
      return
    }
    submitLock.current = true
    setIsSubmitting(true)
    try {
      const details = loadSignupDetails() || {}
      if (!details?.phone) {
        toast.error("Session expired. Please start again.")
        navigate("/food/delivery/login", { replace: true })
        return
      }
      let requested = []
      try {
        requested = JSON.parse(sessionStorage.getItem("deliveryDocumentsRequested") || "[]")
      } catch {
        requested = []
      }
      const partial = Array.isArray(requested) && requested.length > 0
      const formData = await buildFormData(details, liveDocs, { partial })
      const pay = extraPayment || paymentSuccessData
      if (pay && !partial) {
        formData.append("razorpayOrderId", pay.razorpayOrderId)
        formData.append("razorpayPaymentId", pay.razorpayPaymentId)
        formData.append("razorpaySignature", pay.razorpaySignature)
      }
      const useRegister = true
      const phoneDisplay = `${details.countryCode || "+91"} ${String(details.phone).replace(/\D/g, "").slice(-10)}`
      await submitRegistration({ useRegister, formData, navigate, phoneDisplay })
    } catch (error) {
      toast.error(getFriendlyRegistrationError(error))
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (isSubmitting || submitLock.current) return
    if (!isFormValid()) {
      toast.error("Please upload all required documents")
      return
    }

    if (paymentSuccessData && documentsRequested.length === 0) {
      await runSubmit(paymentSuccessData)
      return
    }

    if (feeConfig?.isActive && feeConfig.price > 0 && documentsRequested.length === 0) {
      setIsSubmitting(true)
      try {
        const details = loadSignupDetails()
        const orderRes = await onboardingFeeAPI.createOrder({
          role: "DELIVERY_PARTNER",
          name: details.name || "Delivery Partner",
          phone: String(details.phone || "").replace(/\D/g, "").slice(0, 15),
          email: details.email || "",
        })
        const orderData = orderRes?.data?.data || orderRes?.data
        if (!orderData) throw new Error("Failed to create onboarding payment order")

        if (orderData.alreadyPaid || orderData.bypassPayment) {
          await runSubmit()
          return
        }

        if (!orderData.orderId) throw new Error("Failed to create onboarding payment order")

        if (
          (orderData.isMock || String(orderData.orderId).startsWith("mock_ord_")) &&
          import.meta.env.MODE !== "production"
        ) {
          await runSubmit({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: `mock_pay_${Date.now()}`,
            razorpaySignature: `mock_sig_${Date.now()}`,
          })
          return
        }

        await initRazorpayPayment({
          key: orderData.keyId,
          amount: Math.round(feeConfig.price * 100),
          currency: orderData.currency || "INR",
          order_id: orderData.orderId,
          name: "Onboarding Fee Payment",
          description: `Onboarding fee for ${details.name}`,
          prefill: {
            name: details.name || "",
            email: details.email || "",
            contact: String(details.phone || "").replace(/\D/g, "").slice(0, 15),
          },
          handler: async (response) => {
            const payData = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }
            setPaymentSuccessData(payData)
            sessionStorage.setItem("deliveryPaymentSuccessData", JSON.stringify(payData))
            await runSubmit(payData)
          },
          onError: (err) => {
            toast.error(err?.description || "Payment failed. Please try again.")
            setIsSubmitting(false)
            submitLock.current = false
          },
          onClose: () => {
            toast.error("Payment is required to complete signup.")
            setIsSubmitting(false)
            submitLock.current = false
          },
        })
      } catch (error) {
        toast.error(getFriendlyRegistrationError(error))
        setIsSubmitting(false)
        submitLock.current = false
      }
      return
    }

    await runSubmit()
  }

  const rejectionReason = sessionStorage.getItem("deliveryRejectionReason")

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col"
      style={{ paddingBottom: keyboardInset ? keyboardInset + 16 : undefined }}
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-3 sm:px-4 py-3 flex items-center gap-3 border-b border-slate-200">
        <button type="button" onClick={goBack} className="p-2 -ml-1 hover:bg-gray-100 rounded-full" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Upload documents</h1>
          <p className="text-xs text-gray-500 truncate">Step 2 of 2 · {signupDetails.vehicleType || "vehicle"}</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <DeliveryStepper step={2} />

        {rejectionReason && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            {rejectionReason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {requiredDocs.map((key) => (
            <DocumentUpload
              key={key}
              docType={key}
              label={DOC_KEYS[key] || key}
              file={documents[key]}
              uploaded={uploadedDocs[key]}
              restoring={restoring && !documents[key]}
              onCamera={(docType) =>
                openCamera({
                  onSelectFile: (file) => handleFileSelect(docType, file),
                  fileNamePrefix: `signup-${docType}`,
                })
              }
              onGallery={(docType) =>
                openGallery({
                  onSelectFile: (file) => handleFileSelect(docType, file),
                  fileNamePrefix: `signup-${docType}`,
                })
              }
              onRemove={handleRemove}
            />
          ))}

          {feeConfig?.isActive && feeConfig.price > 0 && documentsRequested.length === 0 && (
            <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 text-sm text-orange-900">
              Onboarding fee: ₹{feeConfig.price}
              {paymentSuccessData && <span className="block text-xs mt-1 text-orange-700">Payment captured — tap Submit to finish.</span>}
            </div>
          )}

          <div className="h-24" />
        </form>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-3 sm:px-4 py-3">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || restoring || !isFormValid()}
            className="w-full min-h-[52px] rounded-xl bg-primary-orange text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting…" : "Submit for verification"}
          </button>
        </div>
      </div>
    </div>
  )
}
