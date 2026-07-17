import { useCallback, useEffect, useState } from "react"
import {
  ShieldCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  FileWarning,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { deliveryAPI } from "@food/api"
import { toast } from "sonner"
import {
  DeliveryPage,
  DeliveryCard,
  DeliveryPrimaryButton,
  DeliverySecondaryButton,
} from "../../components/ui/deliveryUi"

const POLL_MS = 8000

export default function PendingVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const phone =
    location.state?.phone ||
    sessionStorage.getItem("deliveryPendingPhone") ||
    ""

  const [status, setStatus] = useState("pending")
  const [message, setMessage] = useState(
    "Your onboarding is complete. Our team will verify your documents and activate your account after approval."
  )
  const [rejectionReason, setRejectionReason] = useState("")
  const [documentsRequested, setDocumentsRequested] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const fetchStatus = useCallback(async ({ silent = false } = {}) => {
    const digits = String(phone || "").replace(/\D/g, "").slice(-10)
    if (!digits) {
      setLoading(false)
      return null
    }
    if (!silent) setChecking(true)
    try {
      const res = await deliveryAPI.getOnboardingStatus(digits)
      const data = res?.data?.data || res?.data || {}
      if (data.found === false) {
        setStatus("pending")
        setMessage(data.message || "Registration received. Waiting for verification.")
        return data
      }
      const nextStatus = data.status || "pending"
      setStatus(nextStatus)
      setMessage(data.message || "")
      setRejectionReason(data.rejectionReason || "")
      setDocumentsRequested(Array.isArray(data.documentsRequested) ? data.documentsRequested : [])

      if (nextStatus === "approved") {
        sessionStorage.removeItem("deliveryIsRejected")
        sessionStorage.removeItem("deliveryRejectionReason")
        sessionStorage.removeItem("deliveryDocumentsRequested")
        sessionStorage.removeItem("deliveryDocumentsRequired")
      }
      return data
    } catch (err) {
      if (!silent) {
        toast.error(err?.response?.data?.message || "Could not refresh status")
      }
      return null
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }, [phone])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(() => fetchStatus({ silent: true }), POLL_MS)
    const onFocus = () => fetchStatus({ silent: true })
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus({ silent: true })
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [fetchStatus])

  const goLogin = () => navigate("/food/delivery/login", { replace: true })

  const goReupload = () => {
    const digits = String(phone || "").replace(/\D/g, "").slice(-10)
    sessionStorage.setItem("deliveryNeedsRegistration", "true")
    sessionStorage.setItem("deliveryIsRejected", "true")
    if (status === "documents_required") {
      sessionStorage.setItem("deliveryDocumentsRequired", "true")
      sessionStorage.setItem("deliveryDocumentsRequested", JSON.stringify(documentsRequested || []))
    }
    if (rejectionReason) sessionStorage.setItem("deliveryRejectionReason", rejectionReason)
    sessionStorage.setItem(
      "deliverySignupDetails",
      JSON.stringify({ name: "", phone: digits, countryCode: "+91" })
    )
    if (status === "documents_required" && documentsRequested?.length) {
      navigate("/food/delivery/signup/documents", { replace: true })
    } else {
      navigate("/food/delivery/signup/details", { replace: true })
    }
  }

  const isApproved = status === "approved"
  const isRejected = status === "rejected"
  const isDocsRequired = status === "documents_required"

  const iconWrapClass = isApproved
    ? "bg-orange-50 text-primary-orange"
    : isRejected
      ? "bg-red-50 text-red-600"
      : isDocsRequired
        ? "bg-amber-50 text-amber-600"
        : "bg-orange-50 text-primary-orange"

  const badgeClass = isApproved
    ? "bg-orange-50 text-primary-orange"
    : isRejected
      ? "bg-red-50 text-red-700"
      : isDocsRequired
        ? "bg-amber-50 text-amber-800"
        : "bg-orange-50 text-orange-800"

  return (
    <DeliveryPage className="justify-center">
      <DeliveryCard className="delivery-animate-in shadow-lg">
        <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconWrapClass}`}>
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isApproved ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : isRejected ? (
            <XCircle className="h-8 w-8" />
          ) : isDocsRequired ? (
            <FileWarning className="h-8 w-8" />
          ) : (
            <ShieldCheck className="h-8 w-8" />
          )}
        </div>

        <div className="space-y-3">
          <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
            {isApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : isRejected || isDocsRequired ? (
              <FileWarning className="h-3.5 w-3.5" />
            ) : (
              <Clock3 className="h-3.5 w-3.5" />
            )}
            {isApproved
              ? "Approved"
              : isRejected
                ? "Rejected"
                : isDocsRequired
                  ? "Documents Required"
                  : "Verification In Progress"}
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isApproved
              ? "You're approved!"
              : isRejected
                ? "Application not approved"
                : isDocsRequired
                  ? "Re-upload required"
                  : "Your delivery profile is under review"}
          </h1>

          <p className="text-sm leading-6 text-slate-600">{message}</p>

          {(isRejected || isDocsRequired) && rejectionReason ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Reason</p>
              <p className="mt-1 text-sm font-medium text-red-800">{rejectionReason}</p>
            </div>
          ) : null}

          {isDocsRequired && documentsRequested.length > 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Documents to re-upload
              </p>
              <p className="mt-1 text-sm text-amber-900">{documentsRequested.join(", ")}</p>
            </div>
          ) : null}

          {phone ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Registered Number
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{phone}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-700">
              No phone found in session. Sign in with OTP to check your status.
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {isApproved ? (
            <DeliveryPrimaryButton onClick={goLogin}>Sign in to continue</DeliveryPrimaryButton>
          ) : isRejected || isDocsRequired ? (
            <DeliveryPrimaryButton onClick={goReupload}>
              {isDocsRequired ? "Re-upload documents" : "Re-apply"}
            </DeliveryPrimaryButton>
          ) : (
            <DeliverySecondaryButton onClick={() => fetchStatus()} disabled={checking}>
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check status
            </DeliverySecondaryButton>
          )}

          {!isApproved ? (
            <DeliveryPrimaryButton onClick={goLogin}>Back to Login</DeliveryPrimaryButton>
          ) : (
            <DeliverySecondaryButton onClick={goLogin}>Back to Login</DeliverySecondaryButton>
          )}

          <p className="text-center text-xs leading-5 text-slate-500">
            {isApproved
              ? "Use OTP login to access your delivery home and go online."
              : "Status updates automatically every few seconds."}
          </p>
        </div>
      </DeliveryCard>
    </DeliveryPage>
  )
}
