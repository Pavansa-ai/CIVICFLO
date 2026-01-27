export function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function TicketSkeleton() {
  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg space-y-2 shadow-sm">
       <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
       </div>
       <Skeleton className="h-3 w-32" />
       <Skeleton className="h-4 w-16" />
    </div>
  );
}
