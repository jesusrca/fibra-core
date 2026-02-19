import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Skeleton className="h-4 w-32" /> {/* Breadcrumb */}
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-64" /> {/* Title */}
                            <Skeleton className="h-6 w-24 rounded-full" /> {/* Badge */}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-28" /> {/* Button */}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
                <div className="flex gap-6">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Skeleton className="h-48 w-full rounded-xl" /> {/* Progress Card */}
                    <Skeleton className="h-64 w-full rounded-xl" /> {/* Recent Activity */}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-40 w-full rounded-xl" /> {/* Finance Summary */}
                </div>
            </div>
        </div>
    )
}
