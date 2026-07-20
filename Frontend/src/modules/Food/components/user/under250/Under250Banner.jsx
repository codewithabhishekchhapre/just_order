import { motion } from "framer-motion"
import OptimizedImage from "@food/components/OptimizedImage"
import PageNavbar from "@food/components/user/PageNavbar"

const RUPEE_SYMBOL = "\u20B9"

export default function Under250Banner({
  banners = [],
  bannerImages,
  loadingBanner,
  currentBannerIndex,
  hasScrolledPastBanner,
  bannerShellRef,
  stickyHeaderRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDotClick,
}) {
  const slides = Array.isArray(banners) && banners.length > 0
    ? banners
    : (bannerImages || []).map((imageUrl) => ({ imageUrl }))

  const active = slides[currentBannerIndex] || {}

  return (
    <>
      {/* Mobile header — overlays banner, but content below keeps a safe top inset */}
      <div
        ref={stickyHeaderRef}
        className={`fixed top-0 left-0 right-0 z-40 w-full md:hidden transition-all duration-300 ${
          hasScrolledPastBanner
            ? "bg-white/95 dark:bg-[#08080a]/95 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-900"
            : "bg-transparent"
        }`}
      >
        <div className="relative z-50 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
          <PageNavbar
            textColor={hasScrolledPastBanner ? "dark" : "white"}
            zIndex={20}
            showProfile={false}
            showLogo={false}
          />
        </div>
      </div>

      {/* Hero banner — full-bleed under mobile header; overlay padded so copy clears navbar */}
      <div className="max-w-7xl mx-auto w-full min-w-0 overflow-hidden px-4 sm:px-6 lg:px-8 pt-0 md:pt-4">
        <motion.div
          ref={bannerShellRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full min-w-0 h-[260px] sm:h-[280px] md:h-[300px] rounded-3xl overflow-hidden shadow-[0_12px_40px_-12px_rgba(255,106,0,0.25)] border border-orange-100/50 dark:border-gray-800/50"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {slides.length > 0 ? (
            <>
              <div
                className="flex h-full w-full min-w-0 transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
              >
                {slides.map((banner, index) => (
                  <div
                    key={`${banner._id || banner.imageUrl}-${index}`}
                    className="relative h-full w-full min-w-full max-w-full shrink-0"
                  >
                    <OptimizedImage
                      src={banner.imageUrl}
                      alt={`Under ${RUPEE_SYMBOL}250 Banner ${index + 1}`}
                      className="w-full h-full"
                      objectFit="cover"
                      priority={index === 0}
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
                  </div>
                ))}
              </div>

              {/* Overlay: top pad clears fixed PageNavbar on mobile */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 sm:p-6 pt-[4.75rem] md:pt-5">
                <div className="flex items-start justify-between">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                      {active.title || "Budget bites"}
                    </span>
                  </div>
                </div>
                <div className="pr-12">
                  <span className="inline-block bg-[#FF6A00] text-white text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-2">
                    {active.ctaText || active.action || "Best deals"}
                  </span>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
                    {active.subtitle || `Under ${RUPEE_SYMBOL}250`}
                  </h1>
                  <p className="text-white/75 text-xs sm:text-sm font-medium mt-1 line-clamp-2">
                    {active.description || "Delicious meals that won't break the bank"}
                  </p>
                </div>
              </div>

              {slides.length > 1 && (
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
                  {slides.map((_, index) => (
                    <button
                      key={`banner-dot-${index}`}
                      type="button"
                      aria-label={`Go to banner ${index + 1}`}
                      onClick={() => onDotClick(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        currentBannerIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : loadingBanner ? (
            <div className="absolute inset-0 shimmer-bg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6A00] via-[#E85D04] to-[#C84B00] flex flex-col justify-between p-5 sm:p-6 pt-[4.75rem] md:pt-5">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 w-fit">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white">
                  Budget bites
                </span>
              </div>
              <div>
                <span className="inline-block bg-white/20 text-white text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-2 w-fit">
                  Best deals
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
                  Under {RUPEE_SYMBOL}250
                </h1>
                <p className="text-white/80 text-xs sm:text-sm font-medium mt-1">
                  Delicious meals that won&apos;t break the bank
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
