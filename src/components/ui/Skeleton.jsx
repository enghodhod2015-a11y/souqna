// Skeleton Loading Components - Reusable
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
);

export const SkeletonText = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <Skeleton className={`${width} ${height} ${className}`} />
);

export const SkeletonCircle = ({ size = 'w-12 h-12', className = '' }) => (
  <Skeleton className={`rounded-full ${size} ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-primary-card rounded-2xl overflow-hidden border border-gold/30">
    <Skeleton className="w-full h-48" />
    <div className="p-4 space-y-3">
      <SkeletonText width="w-3/4" height="h-6" />
      <SkeletonText width="w-1/2" height="h-5" />
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="flex-1 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);

export const SkeletonProductGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
    {Array(count).fill(0).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonConversationItem = () => (
  <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <SkeletonText width="w-48" height="h-6" className="mb-2" />
        <SkeletonText width="w-32" height="h-4" className="mb-1" />
        <SkeletonText width="w-64" height="h-4" />
      </div>
      <SkeletonCircle size="w-6 h-6" />
    </div>
  </div>
);

export const SkeletonDashboardStats = () => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
    {Array(5).fill(0).map((_, i) => (
      <div key={i} className="bg-primary-card p-4 rounded-2xl border border-gold/30 text-center">
        <SkeletonCircle size="w-8 h-8 mx-auto mb-2" />
        <SkeletonText width="w-16 mx-auto" height="h-3" className="mb-1" />
        <SkeletonText width="w-12 mx-auto" height="h-6" />
      </div>
    ))}
  </div>
);

export const SkeletonProductRow = () => (
  <div className="flex justify-between items-center p-3 bg-secondary-blue/30 rounded-xl">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div>
        <SkeletonText width="w-32" height="h-5" />
        <SkeletonText width="w-20" height="h-4" className="mt-1" />
      </div>
    </div>
    <div className="flex gap-2">
      <SkeletonCircle size="w-5 h-5" />
      <SkeletonCircle size="w-5 h-5" />
    </div>
  </div>
);

export const SkeletonMessage = ({ isOwn = false }) => (
  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-fadeIn`}>
    <SkeletonText width="w-20" height="h-3" className="mb-1" />
    <Skeleton className={`max-w-[70%] h-12 rounded-2xl ${isOwn ? 'rounded-br-none' : 'rounded-bl-none'}`} />
  </div>
);

export const SkeletonOrderItem = () => (
  <div className="bg-primary-card p-4 rounded-2xl border border-gold/30">
    <div className="flex justify-between items-start flex-wrap gap-3">
      <div className="flex-1">
        <SkeletonText width="w-48" height="h-6" className="mb-2" />
        <SkeletonText width="w-32" height="h-4" className="mb-1" />
        <SkeletonText width="w-40" height="h-4" className="mb-1" />
        <SkeletonText width="w-36" height="h-4" />
      </div>
      <Skeleton className="w-24 h-10 rounded-lg" />
    </div>
  </div>
);


