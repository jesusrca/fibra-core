import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="space-y-6 animate-fade-in p-6">
            <div className="page-header">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" /> {/* Title */}
                    <Skeleton className="h-4 w-72" /> {/* Subtitle */}
                </div>
                <Skeleton className="h-10 w-36" /> {/* Action Button */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full rounded-xl" /> {/* Chart */}
                    <Skeleton className="h-64 w-full rounded-xl" /> {/* Table */}
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-xl" /> {/* Pie Chart */}
                    <Skeleton className="h-48 w-full rounded-xl" /> {/* List */}
                </div>
            </div>
        </div>
    )
}
