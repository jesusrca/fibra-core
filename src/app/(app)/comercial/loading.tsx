export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-border/40 rounded-lg"></div>
                    <div className="h-4 w-64 bg-border/40 rounded-lg"></div>
                </div>
                <div className="h-10 w-32 bg-border/40 rounded-lg"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-4">
                        <div className="h-6 w-full bg-border/40 rounded-lg"></div>
                        <div className="space-y-3">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="h-32 w-full bg-border/20 rounded-xl border border-border/40"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
