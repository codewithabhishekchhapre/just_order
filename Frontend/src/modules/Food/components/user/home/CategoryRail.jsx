import React, { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowDownUp } from "lucide-react";
import { CategoryChipRowSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";
import foodPattern from "@food/assets/food_pattern_background.png";

const CategoryRail = memo(({
  displayCategories,
  showCategorySkeleton,
  navigate,
  backendOrigin = ""
}) => {
  return (
    <section className="mt-5 px-4" data-purpose="mind-categories">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">What's on your mind?</h3>
        <span className="text-[11px] font-bold text-[#FF6A00] cursor-pointer hover:underline" onClick={() => navigate("/user/categories")}>See all</span>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {/* Offers Card */}
        <div
          className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
          onClick={() => navigate("/user/under-250")}
        >
          <div className="w-[70px] h-[70px] rounded-2xl overflow-hidden shadow-sm border border-[#FF6A00]/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_18px_rgba(255,106,0,0.18)]">
            <div className="bg-gradient-to-br from-[#FF6A00] to-[#C84B00] w-full h-full flex flex-col items-center justify-center text-white">
              <span className="text-[8px] font-black uppercase tracking-wider opacity-90">Under</span>
              <span className="text-base font-black tracking-tight leading-none">₹250</span>
              <div className="bg-white/20 text-white text-[7px] px-2 py-0.5 rounded-full mt-1.5 font-extrabold uppercase">Claim</div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 group-hover:text-[#FF6A00] transition-colors">Offers</span>
        </div>

        {!showCategorySkeleton && displayCategories.map((category, index) => (
          <Link
            key={category.id || index}
            to={`/user/category/${category.slug || category.name.toLowerCase().replace(/\s+/g, "-")}`}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className="w-[70px] h-[70px] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_18px_rgba(255,106,0,0.12)] group-hover:border-[#FF6A00]/30 bg-gray-50 dark:bg-gray-900">
              <OptimizedImage
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                backendOrigin={backendOrigin}
              />
            </div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 truncate max-w-[70px] text-center group-hover:text-[#FF6A00] transition-colors">
              {category.name}
            </span>
          </Link>
        ))}

        {showCategorySkeleton && <CategoryChipRowSkeleton className="flex-shrink-0" />}
      </div>
    </section>
  );
});

export default CategoryRail;
