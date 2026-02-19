import * as React from 'react'
import { cn } from '@/lib/utils'

export function TremorCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('tremor-panel', className)} {...props} />
}

export function TremorTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('tremor-title', className)} {...props} />
}

export function TremorMetric({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('tremor-metric', className)} {...props} />
}
