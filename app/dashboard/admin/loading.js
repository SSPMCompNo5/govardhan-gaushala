// Loading skeleton for Admin Dashboard
export default function Loading() {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}
