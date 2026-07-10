import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  User, UserPen, ShieldCheck, Gift,
  Edit, Trash2, Phone, Mail, LogOut,
  Eye, FileImage, Calendar, Hash, AlertCircle, X,
  Settings, HelpCircle, FileText, Lock, Globe,
  Share2, Users, Wallet, CircleCheck, Clock3, CircleX, Loader2, ChevronRight,
} from "lucide-react"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@food/components/ui/dialog"
import { restaurantAPI } from "@food/api"
import { clearModuleAuth, getCurrentUser } from "@food/utils/auth"
import { firebaseAuth, ensureFirebaseInitialized } from "@food/firebase"
import { ImageSourcePicker } from "@food/components/ImageSourcePicker"
import { isFlutterBridgeAvailable } from "@food/utils/imageUploadUtils"
import OptimizedImage from "@food/components/OptimizedImage"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { toast } from "sonner"
import RestaurantPageShell from "@food/components/restaurant/RestaurantPageShell"

const debugLog = (...args) => {}
const debugError = (...args) => {}

const TABS = [
  { id: "profile",  label: "Profile",      icon: User        },
  { id: "owner",    label: "Edit Owner",    icon: UserPen     },
  { id: "fssai",    label: "FSSAI",         icon: ShieldCheck },
  { id: "refer",    label: "Refer & Earn",  icon: Gift        },
]

const statusMeta = {
  credited: { label: "Credited",         icon: CircleCheck, bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400" },
  pending:  { label: "Pending Approval", icon: Clock3,       bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400" },
  rejected: { label: "Rejected",         icon: CircleX,      bg: "bg-red-50 dark:bg-red-900/20",     text: "text-red-700 dark:text-red-400"     },
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1 — Profile
═══════════════════════════════════════════════════════════════════ */
function ProfileTab({ restaurantData, loadingRestaurant, onLogout, isLoggingOut }) {
  const navigate = useNavigate()

  const userData = useMemo(() => {
    const session = getCurrentUser("restaurant")
    if (session?.name && session?.role) {
      return {
        name: session.name,
        phone: session.phone || restaurantData?.ownerPhone || restaurantData?.phone || "",
        email: session.email || restaurantData?.ownerEmail || restaurantData?.email || "",
        role: session.role.toUpperCase(),
        profileImage: session.profileImage || restaurantData?.profileImage,
      }
    }
    if (restaurantData) {
      return {
        name: restaurantData.ownerName || restaurantData.name || "Restaurant Owner",
        phone: restaurantData.ownerPhone || restaurantData.phone || "",
        email: restaurantData.ownerEmail || restaurantData.email || "",
        role: "OWNER",
        profileImage: restaurantData.profileImage,
      }
    }
    return { name: loadingRestaurant ? "Loading…" : "Restaurant Owner", phone: "", email: "", role: "OWNER" }
  }, [restaurantData, loadingRestaurant])

  const menuGroups = [
    {
      title: "Account",
      items: [
        { icon: Settings,  label: "Settings",          route: "/food/restaurant/onboarding?step=1" },
        { icon: Globe,     label: "Language",           value: "English", route: null },
      ]
    },
    {
      title: "Help & Legal",
      items: [
        { icon: HelpCircle, label: "Help Centre",        route: "/food/restaurant/help-centre/support" },
        { icon: FileText,   label: "Terms & Conditions", route: "/food/restaurant/terms" },
        { icon: Lock,       label: "Privacy Policy",     route: "#" },
      ]
    }
  ]

  return (
    <div className="py-5 space-y-4">
      {/* Profile card */}
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
              {userData.profileImage?.url ? (
                <img src={userData.profileImage.url} alt={userData.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              )}
            </div>
            <button
              onClick={() => navigate("/food/restaurant/onboarding?step=1")}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FF6A00] rounded-full flex items-center justify-center shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{userData.name}</h2>
            <div className="flex items-center gap-1.5 mt-1 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A00]" strokeWidth={2} />
              <span className="text-[11px] font-bold text-[#FF6A00] uppercase tracking-wider">{userData.role}</span>
            </div>
            <div className="space-y-0.5">
              {userData.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{userData.phone}</span>
                </div>
              )}
              {userData.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{userData.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu groups */}
      {menuGroups.map((group) => (
        <div key={group.title} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-4 pt-3 pb-2">{group.title}</p>
          {group.items.map((item, idx, arr) => (
            <button
              key={idx}
              onClick={() => item.route && navigate(item.route)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left ${idx < arr.length - 1 ? "border-b border-gray-50 dark:border-gray-800/60" : ""}`}
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-gray-600 dark:text-gray-400" strokeWidth={2} />
              </div>
              <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</span>
              {item.value && <span className="text-xs text-gray-400 dark:text-gray-500">{item.value}</span>}
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={onLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
      >
        <LogOut style={{ width: 18, height: 18 }} strokeWidth={2} />
        {isLoggingOut ? "Logging out…" : "Logout"}
      </button>

      <p className="text-center text-xs text-gray-300 dark:text-gray-700 pb-4">App Version 1.0.0</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2 — Edit Owner
═══════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = "restaurant_owner_contact"

function EditOwnerTab({ onHasChanges }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [ownerData, setOwnerData] = useState({ name: "", phone: "", email: "", photo: null })
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", photo: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false)

  const hasChanges = formData.name !== ownerData.name || formData.email !== ownerData.email || profileImageFile !== null

  useEffect(() => { onHasChanges?.(hasChanges) }, [hasChanges])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await restaurantAPI.getCurrentRestaurant()
        const data = res?.data?.data?.restaurant || res?.data?.restaurant
        if (data && mounted) {
          const d = { name: data.ownerName || data.name || "", phone: data.ownerPhone || data.primaryContactNumber || data.phone || "", email: data.ownerEmail || data.email || "", photo: data.profileImage?.url || null }
          setOwnerData(d); setFormData(d)
        }
      } catch {
        try { const s = localStorage.getItem(STORAGE_KEY); if (s && mounted) { const p = JSON.parse(s); setOwnerData(p); setFormData(p) } } catch {}
      } finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const handleInput = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: field === "name" ? value.replace(/[^A-Za-z\s]/g, "") : value }))
  }

  const handlePhotoSelect = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size too large. Max 5MB allowed."); return }
    setProfileImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setFormData(prev => ({ ...prev, photo: e.target?.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) { toast.error("Name should only contain letters and spaces"); return }
      const email = formData.email ? String(formData.email).trim() : ""
      if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}$/.test(email)) { toast.error("Invalid email format"); return }

      let uploadedPhotoUrl = null
      if (profileImageFile) {
        try {
          const imgRes = await restaurantAPI.uploadProfileImage(profileImageFile)
          uploadedPhotoUrl = imgRes?.data?.data?.image?.url || imgRes?.data?.image?.url
        } catch { toast.error("Failed to upload profile image."); return }
      }

      const res = await restaurantAPI.updateProfile({ ownerName: formData.name.trim(), ownerEmail: email, ownerPhone: formData.phone.trim() })
      if (res?.data?.success) {
        const saved = uploadedPhotoUrl ? { ...formData, photo: uploadedPhotoUrl } : { ...formData }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch {}
        window.dispatchEvent(new Event("ownerDataUpdated"))
        setOwnerData(saved); setProfileImageFile(null)
        toast.success("Owner details saved")
      } else { throw new Error("Invalid response") }
    } catch (e) { debugError(e); toast.error(e?.response?.data?.message || "Failed to save. Please try again.") }
    finally { setSaving(false) }
  }

  const handleDeleteAccount = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await restaurantAPI.deleteAccount()
      try {
        const { signOut } = await import("firebase/auth")
        ensureFirebaseInitialized({ enableAuth: true, enableRealtimeDb: false })
        if (firebaseAuth.currentUser) await signOut(firebaseAuth)
      } catch {}
      clearModuleAuth("restaurant")
      ;[STORAGE_KEY, "restaurant_onboarding", "restaurant_accessToken", "restaurant_authenticated", "restaurant_user", "restaurant_invited_users"].forEach(k => localStorage.removeItem(k))
      sessionStorage.removeItem("restaurantAuthData")
      window.dispatchEvent(new Event("restaurantAuthChanged"))
      setShowDeleteDialog(false)
      setTimeout(() => navigate("/restaurant/welcome", { replace: true }), 300)
    } catch (e) { debugError(e); toast.error(e?.response?.data?.message || "Failed to delete account."); setIsDeleting(false) }
  }

  return (
    <>
      <div className="py-5 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex items-center justify-center">
            {loading ? <User className="w-12 h-12 text-gray-400" /> : formData.photo ? <OptimizedImage src={formData.photo} alt="Owner" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-400" />}
          </div>
          <button onClick={() => isFlutterBridgeAvailable() ? setIsPhotoPickerOpen(true) : fileInputRef.current?.click()} disabled={loading || saving} className="text-[#FF6A00] text-sm font-medium hover:text-[#e05e00] transition-colors disabled:opacity-50">
            Edit photo
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoSelect(e.target.files?.[0])} disabled={loading || saving} />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { field: "name",  label: "Name",         type: "text",  editable: true },
            { field: "phone", label: "Phone number",  type: "tel",   editable: false },
            { field: "email", label: "Email",         type: "email", editable: true },
          ].map(({ field, label, type, editable }) => (
            <div key={field}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
              <div className="relative">
                <Input
                  type={type}
                  value={loading ? "Loading…" : formData[field]}
                  onChange={e => editable && handleInput(field, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className={`w-full ${editable ? "pr-9 focus:border-[#FF6A00] focus:ring-[#FF6A00]" : ""} dark:bg-[#1a1a1a] dark:border-gray-700 dark:text-white`}
                  readOnly={!editable}
                  disabled={loading || saving}
                />
                {editable && <Edit className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF6A00]" />}
              </div>
            </div>
          ))}
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || loading || saving}
          className={`w-full h-12 text-sm font-bold rounded-2xl ${hasChanges && !loading && !saving ? "bg-[#FF6A00] hover:bg-[#e05e00] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"} transition-colors`}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>

        {/* Delete account */}
        <div className="pt-2">
          <button onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Delete your account</span>
          </button>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md w-[90%] p-5 rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl leading-none text-red-600">!</span>
            </div>
            <DialogTitle className="text-base font-semibold text-center">Delete your Appzeto account?</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-gray-600 text-center">All information will be permanently deleted and cannot be recovered.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handleDeleteAccount} disabled={isDeleting} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
              {isDeleting ? "Deleting…" : "Confirm"}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting} className="w-full disabled:opacity-50">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handlePhotoSelect}
        title="Update owner photo"
        description="Choose how to upload your owner profile photo"
        fileNamePrefix="owner-photo"
        galleryInputRef={fileInputRef}
      />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 3 — FSSAI
═══════════════════════════════════════════════════════════════════ */
function FssaiTab() {
  const navigate = useNavigate()
  const [restaurantData, setRestaurantData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showViewer, setShowViewer] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await restaurantAPI.getCurrentRestaurant()
        const data = res?.data?.data?.restaurant || res?.data?.restaurant
        if (data && mounted) setRestaurantData(data)
      } catch { toast.error("Failed to load FSSAI details") }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not available" } catch { return d } }
  const hasFssai = restaurantData?.fssaiNumber?.trim()
  const imgSrc = restaurantData?.fssaiImage ? (typeof restaurantData.fssaiImage === "string" ? restaurantData.fssaiImage : restaurantData.fssaiImage?.url) : null

  if (loading) return <div className="py-20 flex items-center justify-center"><Loader2 className="w-7 h-7 text-gray-300 animate-spin" /></div>

  return (
    <div className="py-5 space-y-4">
      {!hasFssai && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">FSSAI details not added</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Upload your license to complete compliance.</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {[
          { icon: Hash, iconBg: "bg-[#FF6A00]/10", iconColor: "text-[#FF6A00]", label: "Registration number", value: restaurantData?.fssaiNumber || "Not available", hasValue: !!hasFssai },
          { icon: FileImage, iconBg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-600 dark:text-blue-400", label: "License document", value: imgSrc ? "FSSAI License Document" : "No document uploaded", hasValue: !!imgSrc, extra: imgSrc },
          { icon: Calendar, iconBg: "bg-green-50 dark:bg-green-900/20", iconColor: "text-green-600 dark:text-green-400", label: "Valid until", value: fmt(restaurantData?.fssaiExpiry), hasValue: !!restaurantData?.fssaiExpiry },
        ].map(({ icon: Icon, iconBg, iconColor, label, value, hasValue, extra }, i, arr) => (
          <div key={label} className={`px-4 py-4 flex items-center gap-3 ${i < arr.length - 1 ? "border-b border-gray-50 dark:border-gray-800/60" : ""}`}>
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`${iconColor}`} style={{ width: 18, height: 18 }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${hasValue ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-600"}`}>{value}</p>
            </div>
            {extra && (
              <button onClick={() => setShowViewer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                <Eye className="w-3 h-3" /> View
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#FF6A00] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">FSSAI registration is mandatory for all food businesses in India. Keep your license up to date to continue receiving orders.</p>
      </div>

      <button
        onClick={() => navigate("/food/restaurant/fssai/update")}
        className="w-full h-12 bg-[#FF6A00] hover:bg-[#e05e00] text-white font-semibold text-sm rounded-2xl active:scale-[0.98] transition-all"
      >
        {hasFssai ? "Update FSSAI license" : "Add FSSAI license"}
      </button>

      {showViewer && imgSrc && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">FSSAI License Document</h3>
            <button onClick={() => setShowViewer(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img src={imgSrc} alt="FSSAI License" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 4 — Refer & Earn
═══════════════════════════════════════════════════════════════════ */
function ReferEarnTab() {
  const companyName = useCompanyName()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ referralCount: 0, totalReferralEarnings: 0, rewardAmount: 0, totalInvited: 0, creditedCount: 0, pendingCount: 0, rejectedCount: 0 })
  const [referredRestaurants, setReferredRestaurants] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        try { const r = await restaurantAPI.getCurrentRestaurant(); if (!cancelled) setProfile(r?.data?.data?.restaurant || r?.data?.restaurant) } catch { if (!cancelled) setProfile(getCurrentUser("restaurant")) }
        const res = await restaurantAPI.getReferralDetails()
        const s = res?.data?.data?.stats || {}
        if (!cancelled) {
          setStats({ referralCount: +s.referralCount || 0, totalReferralEarnings: +s.totalReferralEarnings || 0, rewardAmount: +s.rewardAmount || 0, totalInvited: +s.totalInvited || 0, creditedCount: +s.creditedCount || 0, pendingCount: +s.pendingCount || 0, rejectedCount: +s.rejectedCount || 0 })
          setReferredRestaurants(Array.isArray(res?.data?.data?.referredRestaurants) ? res.data.data.referredRestaurants : [])
        }
      } catch { if (!cancelled) toast.error("Failed to load referral details") }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const refCode = profile?.referralCode || profile?._id || ""
  const referralLink = refCode ? `${window.location.origin}/food/restaurant/onboarding?ref=${encodeURIComponent(String(refCode))}` : ""
  const shareText = useMemo(() => `Join ${companyName} as a Restaurant Partner and earn ${stats.rewardAmount > 0 ? `₹${stats.rewardAmount}` : "rewards"} on approval! Use my referral link:`, [companyName, stats.rewardAmount])

  const handleShare = async () => {
    if (!referralLink) { toast.error("Referral link unavailable"); return }
    try {
      if (navigator.share) { await navigator.share({ title: `${companyName} Restaurant Referral`, text: shareText, url: referralLink }); return }
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${shareText} ${referralLink}`); toast.success("Referral link copied") }
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`, "_blank", "noopener,noreferrer")
    } catch (e) { if (e?.name !== "AbortError") toast.error("Unable to share right now") }
  }

  return (
    <div className="py-5 space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FF6A00] to-[#e05e00] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold">Earn per successful referral</p>
            <p className="text-2xl font-black">₹{stats.rewardAmount}</p>
          </div>
        </div>
        <p className="text-sm text-orange-100 mb-4 leading-relaxed">Invite restaurants to join {companyName} and earn ₹{stats.rewardAmount} when they get approved!</p>
        <button onClick={handleShare} disabled={!referralLink} className="w-full h-11 bg-white text-[#FF6A00] font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Share2 className="w-4 h-4" strokeWidth={2.5} /> Share Referral Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,       label: "Invited",  value: stats.totalInvited },
          { icon: CircleCheck, label: "Approved", value: stats.creditedCount },
          { icon: Wallet,      label: "Earned",   value: `₹${stats.totalReferralEarnings}` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <Icon className="w-4 h-4 text-[#FF6A00] mx-auto mb-1.5" strokeWidth={2} />
            <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Referred restaurants list */}
      <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800/60">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Referred Restaurants</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
        ) : referredRestaurants.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No referrals yet.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Share your link to start inviting!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {referredRestaurants.map((item) => {
              const meta = statusMeta[item?.status] || statusMeta.pending
              const StatusIcon = meta.icon
              const dateText = item?.invitedAt ? new Date(item.invitedAt).toLocaleDateString("en-IN") : "—"
              return (
                <div key={item?.id || item?.refereeId} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item?.name || "Restaurant"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item?.phone || "Phone hidden"}</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Joined {dateText}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                      <StatusIcon className="w-3 h-3" strokeWidth={2} /> {meta.label}
                    </span>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1.5">+₹{Number(item?.earnedAmount) || 0}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════════ */
export default function AccountSettings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const companyName = useCompanyName()

  const paramTab = searchParams.get("tab")
  const validTabs = TABS.map(t => t.id)
  const [activeTab, setActiveTab] = useState(validTabs.includes(paramTab) ? paramTab : "profile")

  // Shared restaurant data (Profile + EditOwner both need it, avoid double fetch)
  const [restaurantData, setRestaurantData] = useState(null)
  const [loadingRestaurant, setLoadingRestaurant] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await restaurantAPI.getCurrentRestaurant()
        const data = res?.data?.data?.restaurant || res?.data?.restaurant
        if (data && mounted) setRestaurantData(data)
      } catch {}
      finally { if (mounted) setLoadingRestaurant(false) }
    })()
    return () => { mounted = false }
  }, [])

  const switchTab = (id) => {
    setActiveTab(id)
    setSearchParams({ tab: id }, { replace: true })
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      try { await restaurantAPI.logout() } catch {}
      try {
        const { signOut } = await import("firebase/auth")
        ensureFirebaseInitialized({ enableAuth: true, enableRealtimeDb: false })
        if (firebaseAuth.currentUser) await signOut(firebaseAuth)
      } catch {}
      clearModuleAuth("restaurant")
      localStorage.removeItem("restaurant_onboarding")
      window.dispatchEvent(new Event("restaurantAuthChanged"))
      navigate("/food/restaurant/login", { replace: true })
    } catch {
      clearModuleAuth("restaurant")
      navigate("/food/restaurant/login", { replace: true })
    } finally { setIsLoggingOut(false) }
  }

  const tabBar = (
    <div className="flex gap-1 overflow-x-auto scrollbar-none -mb-px">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
              active
                ? "border-[#FF6A00] text-[#FF6A00]"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
            {label}
          </button>
        )
      })}
    </div>
  )

  return (
    <RestaurantPageShell
      title="Account"
      subtitle="Profile, compliance & referrals"
      maxWidth="lg"
      tabs={tabBar}
      contentClassName="py-4"
    >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "profile" && <ProfileTab restaurantData={restaurantData} loadingRestaurant={loadingRestaurant} onLogout={handleLogout} isLoggingOut={isLoggingOut} />}
            {activeTab === "owner"   && <EditOwnerTab />}
            {activeTab === "fssai"   && <FssaiTab />}
            {activeTab === "refer"   && <ReferEarnTab />}
          </motion.div>
        </AnimatePresence>
    </RestaurantPageShell>
  )
}
