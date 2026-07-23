import { Gift, Percent, Wallet } from "lucide-react";

const CARDS = [
  {
    id: "wallet",
    title: "Save with Wallet",
    subtitle: "Get cashback on every prepaid ride",
    icon: Wallet,
    tone: "from-[#FF6A00] to-[#ff8a3d]",
  },
  {
    id: "promo",
    title: "Save with Promo",
    subtitle: "Apply codes before you book",
    icon: Percent,
    tone: "from-emerald-500 to-teal-500",
  },
  {
    id: "member",
    title: "Membership Benefits",
    subtitle: "Priority pickup & exclusive fares",
    icon: Gift,
    tone: "from-slate-800 to-slate-600",
  },
];

export default function SavingsSection({ onOpenWallet }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => (card.id === "wallet" ? onOpenWallet?.() : null)}
            className={`w-[200px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${card.tone} p-3.5 text-left text-white shadow-md active:scale-[0.98]`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-extrabold leading-tight">
              {card.title}
            </p>
            <p className="mt-1 text-[11px] text-white/85 leading-snug">
              {card.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
}
