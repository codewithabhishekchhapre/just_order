import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  AlertCircle
} from "lucide-react"
import { restaurantAPI } from "@food/api"
import { toast } from "sonner"
import { Modal, ModalFooter } from "@food/components/restaurant/Modal"

const defaultFormData = {
  couponCode: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  expiryDate: "",
  usageLimit: "",
  description: "",
}

const statusBadgeClass = (status) => {
  const value = String(status || "Pending").toLowerCase()
  if (value === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (value === "rejected") return "bg-rose-50 text-rose-700 border-rose-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

export default function CreateCouponsPage() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [formData, setFormData] = useState(defaultFormData)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const response = await restaurantAPI.getCoupons()
      const list = response?.data?.data || []
      setCoupons(Array.isArray(list) ? list : [])
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load coupons")
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setShowModal(false)
    setEditingCoupon(null)
    setFormData(defaultFormData)
  }

  const openCreateModal = () => {
    setEditingCoupon(null)
    setFormData(defaultFormData)
    setShowModal(true)
  }

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      couponCode: coupon?.couponCode || "",
      discountType: coupon?.discountType || "percentage",
      discountValue: coupon?.discountValue || "",
      minOrderAmount: coupon?.minOrderAmount || "",
      expiryDate: coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : "",
      usageLimit: coupon?.usageLimit || "",
      description: coupon?.description || "",
    })
    setShowModal(true)
  }

  const handleSaveCoupon = async () => {
    if (!formData.couponCode.trim()) {
      toast.error("Coupon code is required")
      return
    }
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      toast.error("Discount value must be greater than 0")
      return
    }
    if (!formData.expiryDate) {
      toast.error("Expiry date is required")
      return
    }

    try {
      const payload = {
        couponCode: formData.couponCode.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        expiryDate: new Date(formData.expiryDate).toISOString(),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        description: formData.description.trim()
      }

      if (editingCoupon) {
        await restaurantAPI.updateCoupon(editingCoupon._id || editingCoupon.id, payload)
        toast.success("Coupon request updated and sent for admin approval")
      } else {
        await restaurantAPI.createCoupon(payload)
        toast.success("Coupon request submitted and pending admin approval")
      }

      resetModal()
      fetchCoupons()
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save coupon")
    }
  }

  const handleDeleteCoupon = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.couponCode}"?`)) return

    try {
      await restaurantAPI.deleteCoupon(coupon._id || coupon.id)
      toast.success("Coupon deleted successfully")
      fetchCoupons()
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete coupon")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      <div className="sticky top-0 z-40 bg-white dark:bg-[#111] border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={goBack} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Create Coupons</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Submit campaigns for admin review & approval.</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Info Card */}
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Campaign Approval System</p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                Every coupon remains pending until approved by the admin. Once approved, users can apply it to orders from your outlet. Editing resets status to pending.
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={openCreateModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6A00] hover:bg-[#e05e00] px-4 py-3 font-semibold text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Coupon
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-6 py-12 text-center">
            <p className="text-base font-semibold text-gray-900 dark:text-white">No coupons yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Create a custom campaign code and boost your orders.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => {
              const status = coupon?.status || "Pending"
              const expiryFormatted = coupon?.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

              return (
                <motion.div
                  key={coupon._id || coupon.id}
                  layout
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111] p-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white tracking-wider bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                          {coupon.couponCode}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(status)}`}>
                          {status === "Approved" ? <BadgeCheck className="mr-1 h-3.5 w-3.5" /> : <Clock3 className="mr-1 h-3.5 w-3.5" />}
                          {status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#FF6A00]">
                          {coupon.discountType === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT OFF`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Min. ₹{coupon.minOrderAmount || 0} • Expires {expiryFormatted}
                        </p>
                        {coupon.usageLimit && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {coupon.usedCount || 0} / {coupon.usageLimit} uses
                          </p>
                        )}
                        {coupon.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                            "{coupon.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(coupon)}
                        className="rounded-xl bg-[#FF6A00]/10 p-2 text-[#FF6A00] hover:bg-[#FF6A00]/20 transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={resetModal}
        title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
        description="Configure your promo campaign. Resubmitting will reset status to pending."
        icon={Plus}
        size="lg"
        footer={
          <ModalFooter>
            <button onClick={resetModal} className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-3 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSaveCoupon}
              className="flex-1 rounded-xl bg-[#FF6A00] hover:bg-[#e05e00] py-3 font-semibold text-white transition-colors"
            >
              {editingCoupon ? "Save Changes" : "Submit Coupon"}
            </button>
          </ModalFooter>
        }
      >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Coupon Code</label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                    placeholder="E.g. GET50, FESTIVE100"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10 font-bold tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discountType: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-3 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Flat (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Value</label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discountValue: e.target.value }))}
                      placeholder={formData.discountType === "percentage" ? "10 for 10%" : "50 for ₹50"}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Min. Order Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                      placeholder="E.g. 199"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Usage Limit (Optional)</label>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, usageLimit: e.target.value }))}
                      placeholder="Total uses allowed"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter details like 'Get flat 10% off up to ₹100'"
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/10"
                  />
                </div>
              </div>
      </Modal>
    </div>
  )
}
