import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return <Loader2 className={cn("animate-spin text-blue-600", className)} style={{ width: size, height: size }} />
}

export function PageSpinner({ tip }: { tip?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
      <Spinner size={36} />
      {tip && <p className="mt-3 text-sm text-slate-400">{tip}</p>}
    </div>
  )
}
