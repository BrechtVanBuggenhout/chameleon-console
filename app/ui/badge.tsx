import { cn } from '@/app/utils'

type BadgeVariant =
  | 'declared'
  | 'ghost'
  | 'policy_warning'
  | 'PASS'
  | 'WARN'
  | 'FAIL'
  | 'connected'
  | 'warning'
  | 'disconnected'
  | 'COMPLETED'
  | 'CERTIFIED'
  | 'PENDING'

const variantStyles: Record<BadgeVariant, string> = {
  declared: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  PASS: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  connected: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  COMPLETED: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  CERTIFIED: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  policy_warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  WARN: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  ghost: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  FAIL: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  disconnected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  PENDING: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/20',
}

const variantLabels: Partial<Record<BadgeVariant, string>> = {
  declared: 'Declared',
  ghost: 'Ghost',
  policy_warning: 'Policy warning',
  connected: 'Connected',
  warning: 'Warning',
  disconnected: 'Disconnected',
}

export function Badge({
  variant,
  label,
  className,
}: {
  variant: BadgeVariant
  label?: string
  className?: string
}) {
  const displayLabel = label ?? variantLabels[variant] ?? variant
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
