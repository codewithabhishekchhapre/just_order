import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import { deliveryAPI } from "@food/api"
import { clearModuleAuth } from "@food/utils/auth"
import { useCompanyName } from "@food/hooks/useCompanyName"
import {
  loadBusinessSettings,
  getCachedSettings,
  getAppFavicon,
  updateBrowserFavicon,
  getAppLogo,
} from "@common/utils/businessSettings"
import loginBg from "@food/assets/deliveryloginbanner.png"
import { ShieldCheck, ChevronRight } from "lucide-react"

const debugLog = (...args) => { }
const debugWarn = (...args) => { }
const debugError = (...args) => { }


// Common country codes
const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
]

export default function DeliverySignIn() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const referralCode = searchParams.get("ref") || ""
  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91",
  })
  const [logoUrl, setLogoUrl] = useState(() => getAppLogo('delivery'))

  // Pre-fill form from sessionStorage if data exists (e.g., when coming back from OTP)
  useEffect(() => {
    const stored = sessionStorage.getItem("deliveryAuthData")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.phone) {
          // Extract digits after +91
          const phoneDigits = data.phone.replace("+91", "").trim()
          setFormData(prev => ({
            ...prev,
            phone: phoneDigits
          }))
        }
      } catch (err) {
        debugError("Error parsing stored auth data:", err)
      }
    }
  }, [])

  useEffect(() => {
    const applyDeliveryBranding = () => {
      const deliveryFavicon = getAppFavicon("delivery")
      if (deliveryFavicon) {
        updateBrowserFavicon(deliveryFavicon)
      }
      const deliveryLogo = getAppLogo("delivery")
      if (deliveryLogo) {
        setLogoUrl(deliveryLogo)
      }
    }

    const cached = getCachedSettings()
    if (cached) {
      applyDeliveryBranding()
    } else {
      loadBusinessSettings().then(() => {
        applyDeliveryBranding()
      })
    }

    const handleSettingsUpdate = (event) => {
      const settings = event?.detail
      if (!settings) return
      const favicon = settings.deliveryFavicon?.url || settings.favicon?.url || ""
      if (favicon) {
        updateBrowserFavicon(favicon)
      }
      const deliveryLogo = getAppLogo("delivery")
      if (deliveryLogo) {
        setLogoUrl(deliveryLogo)
      }
    }

    window.addEventListener("businessSettingsUpdated", handleSettingsUpdate)
    return () => {
      window.removeEventListener("businessSettingsUpdated", handleSettingsUpdate)
    }
  }, [])
  const [error, setError] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Get selected country details dynamically
  const selectedCountry = countryCodes.find(c => c.code === formData.countryCode) || countryCodes[2] // Default to India (+91)

  const validatePhone = (phone, countryCode) => {
    if (!phone || phone.trim() === "") {
      return "Phone number is required"
    }

    const digitsOnly = phone.replace(/\D/g, "")

    if (digitsOnly.length < 7) {
      return "Phone number must be at least 7 digits"
    }

    // India-specific validation
    // India-specific validation (Fixed to +91 only)
    if (digitsOnly.length !== 10) {
      return "Phone number must be exactly 10 digits"
    }

    return ""
  }

  const handleSendOTP = async () => {
    setError("")

    const phoneError = validatePhone(formData.phone, formData.countryCode)
    if (phoneError) {
      setError(phoneError)
      return
    }

    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      setIsSending(true)
      // Start a fresh login flow and prevent stale-token auto redirects.
      clearModuleAuth("delivery")

      // Call backend to send OTP for delivery login
      await deliveryAPI.sendOTP(fullPhone, "login")

      // Store auth data in sessionStorage for OTP page
      const authData = {
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        purpose: "login",
        module: "delivery",
      }
      sessionStorage.setItem("deliveryAuthData", JSON.stringify(authData))

      if (referralCode) {
        try {
          const existingSignupDetails = JSON.parse(sessionStorage.getItem("deliverySignupDetails") || "{}")
          sessionStorage.setItem("deliverySignupDetails", JSON.stringify({
            ...existingSignupDetails,
            ref: referralCode
          }))
        } catch (e) { }
      }

      // Navigate to OTP page
      navigate("/food/delivery/otp")
    } catch (err) {
      debugError("Send OTP Error:", err)
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send OTP. Please try again."
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const handlePhoneChange = (e) => {
    // Only allow digits and limit to 10 digits
    const value = e.target.value.replace(/\D/g, "").slice(0, 10)
    setFormData({
      ...formData,
      phone: value,
    })
  }

  const handleCountryCodeChange = (value) => {
    setFormData({
      ...formData,
      countryCode: value,
    })
  }

  const isValid = !validatePhone(formData.phone, formData.countryCode)

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-4 md:p-8">
      <div className="w-full max-w-[1000px] bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row">
        
        {/* ── Image Panel ── */}
        <div className="w-full lg:w-[45%] h-64 lg:h-auto relative flex-shrink-0">
          <img
            src={loginBg}
            alt="Delivery partner banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-br from-black/80 via-black/40 to-transparent" />

          {/* Glass card content */}
          <div className="absolute inset-0 flex items-end justify-start p-6 lg:p-10">
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6 w-full max-w-sm">
              {logoUrl && (
                <img src={logoUrl} alt={companyName} className="h-8 lg:h-10 w-auto object-contain mb-3 lg:mb-4 rounded-xl bg-white p-1" />
              )}
              <h2 className="text-xl lg:text-2xl font-bold text-white leading-tight mb-2">
                Deliver with {companyName}
              </h2>
              <p className="text-xs lg:text-sm text-white/80 leading-relaxed hidden sm:block">
                Join our fleet of delivery partners and earn on your own schedule.
              </p>
            </div>
          </div>
        </div>

        {/* ── Form Panel ── */}
        <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:p-12 xl:p-16">
          <div className="w-full max-w-sm mx-auto">
            {/* Heading */}
            <div className="mb-8">
              {!logoUrl && (
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-600/20">
                  <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
              )}
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign in to your delivery partner account
              </p>
            </div>

            <div className="space-y-5">
              {/* Phone input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Mobile number
                </label>
                <div className={`flex items-center gap-3 h-14 bg-gray-50 dark:bg-gray-800/50 border rounded-2xl px-4 transition-all duration-200 ${
                  error
                    ? "border-red-400 dark:border-red-600 ring-2 ring-red-100 dark:ring-red-900/30"
                    : "border-gray-200 dark:border-gray-700 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-600/10"
                }`}>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formData.countryCode}
                  </span>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel-national"
                    enterKeyHint="done"
                    placeholder="Enter 10-digit number"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleSendOTP() }}
                    className="flex-1 bg-transparent border-0 outline-none ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 caret-red-600 min-w-0"
                  />
                </div>
                {error && (
                  <p className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1 pl-1">
                    <span>⚠</span> {error}
                  </p>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={handleSendOTP}
                disabled={!isValid || isSending}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 border-0 flex items-center justify-center gap-2 ${
                  isValid && !isSending
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 active:scale-[0.98]"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                }`}
                style={{ height: 52 }}
              >
                {isSending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending OTP…
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 leading-relaxed pt-2">
                By continuing you agree to our{" "}
                <Link
                  to="/food/delivery/terms"
                  className="text-red-600 font-semibold bg-transparent border-0 p-0 cursor-pointer hover:underline"
                >
                  Terms &amp; Conditions
                </Link>
                {" "}and{" "}
                <Link
                  to="/food/delivery/privacy"
                  className="text-red-600 font-semibold bg-transparent border-0 p-0 cursor-pointer hover:underline"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
            
            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 font-medium tracking-widest uppercase">
                © {new Date().getFullYear()} {companyName} Partner
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


