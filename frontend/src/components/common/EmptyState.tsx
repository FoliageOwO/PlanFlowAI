import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Inbox } from 'lucide-react'

interface Props {
  description?: string
  actionText?: string
  actionPath?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export default function EmptyState({
  description = '暂无数据',
  actionText,
  actionPath,
  onAction,
  icon,
}: Props) {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionPath) {
      navigate(actionPath)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
        {icon || <Inbox className="w-8 h-8 text-gray-300" />}
      </div>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      {actionText && (
        <Button variant="outline" onClick={handleAction}>
          {actionText}
        </Button>
      )}
    </div>
  )
}
