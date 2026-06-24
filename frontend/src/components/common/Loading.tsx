import { Spinner } from '../ui/spinner'

interface Props {
  tip?: string
  fullPage?: boolean
}

export default function Loading({ tip = '加载中...', fullPage = false }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: fullPage ? 0 : '48px 0', minHeight: fullPage ? '100vh' : 200 }}
    >
      <Spinner size={fullPage ? 40 : 32} />
      {tip && <p className="mt-3 text-sm text-slate-400">{tip}</p>}
    </div>
  )
}
