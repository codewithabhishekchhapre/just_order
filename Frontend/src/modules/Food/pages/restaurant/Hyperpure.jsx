import { Leaf, ExternalLink } from "lucide-react"
import { useCompanyName } from "@food/hooks/useCompanyName"

export default function Hyperpure() {
  const companyName = useCompanyName()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="bg-white dark:bg-[#111] border-b border-gray-100 dark:border-gray-800 px-4 py-4">
        <h1 className="text-base font-bold text-gray-900 dark:text-white">Hyperpure</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fresh ingredients sourcing</p>
      </div>
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-3xl flex items-center justify-center mb-5">
          <Leaf className="w-10 h-10 text-green-500 dark:text-green-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
          Hyperpure sourcing integration is under development. Order fresh, high-quality ingredients directly through {companyName}.
        </p>
        <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
          <ExternalLink className="w-3.5 h-3.5" />
          Integration coming soon
        </div>
      </div>
    </div>
  )
}
