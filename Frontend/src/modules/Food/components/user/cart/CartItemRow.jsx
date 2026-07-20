import { memo } from "react"
import { Minus, Plus, Utensils } from "lucide-react"

const RUPEE = "\u20B9"
const QTY_CLASS =
  "flex h-8 w-[88px] shrink-0 items-center overflow-hidden rounded-lg border border-[#FF6A00] bg-white dark:bg-[#111]"

function CartItemRow({ item, onDecrement, onIncrement }) {
  const unit = Number(item?.price || 0)
  const other = Number(item?.otherPrice || 0)
  const qty = Number(item?.quantity || 1)
  const lineTotal = unit * qty
  const lineOther = other * qty
  const hasSave = other > unit

  return (
    <div className="flex min-w-0 items-start gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/10 sm:h-16 sm:w-16">
        {item?.image ? (
          <img
            src={item.image}
            alt={item.name || "Item"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Utensils className="h-5 w-5 text-gray-300" />
          </div>
        )}
        <div
          className={`absolute left-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border bg-white ${
            item?.isVeg !== false ? "border-green-600" : "border-red-600"
          }`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              item?.isVeg !== false ? "bg-green-600" : "bg-red-600"
            }`}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-950 dark:text-gray-100">
          {item?.name}
        </p>
        {item?.variantName ? (
          <p className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {item.variantName}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {RUPEE}
            {unit.toFixed(0)}
          </span>
          {hasSave ? (
            <>
              <span className="text-[10px] text-gray-400 line-through">
                {RUPEE}
                {other.toFixed(0)}
              </span>
              <span className="rounded-full bg-green-50 px-1.5 py-px text-[9px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                Save {RUPEE}
                {(other - unit).toFixed(0)}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className={QTY_CLASS}>
          <button
            type="button"
            aria-label="Decrease quantity"
            className="flex h-full w-7 items-center justify-center text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-[#FF6A00]/10"
            onClick={() => onDecrement?.(item)}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="flex-1 text-center text-xs font-black tabular-nums text-[#FF6A00]">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="flex h-full w-7 items-center justify-center text-[#FF6A00] hover:bg-orange-50 dark:hover:bg-[#FF6A00]/10"
            onClick={() => onIncrement?.(item)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-right leading-tight">
          {hasSave ? (
            <p className="text-[10px] text-gray-400 line-through">
              {RUPEE}
              {lineOther.toFixed(0)}
            </p>
          ) : null}
          <p className="text-sm font-black tabular-nums text-gray-950 dark:text-gray-100">
            {RUPEE}
            {lineTotal.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}

function areEqual(prev, next) {
  const a = prev.item
  const b = next.item
  return (
    a?.id === b?.id &&
    a?.quantity === b?.quantity &&
    a?.price === b?.price &&
    a?.otherPrice === b?.otherPrice &&
    a?.name === b?.name &&
    a?.variantName === b?.variantName &&
    a?.image === b?.image
  )
}

export default memo(CartItemRow, areEqual)
