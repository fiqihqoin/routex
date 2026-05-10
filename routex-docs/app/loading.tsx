export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[720px] pt-8 pb-16 px-6 md:px-12 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-48 bg-surface-elevated rounded mb-6" />
      
      {/* Title skeleton */}
      <div className="h-12 w-3/4 bg-surface-elevated rounded-lg mb-4" />
      
      {/* Description skeleton */}
      <div className="h-6 w-full bg-surface-elevated rounded mb-2" />
      <div className="h-6 w-2/3 bg-surface-elevated rounded mb-10" />
      
      {/* Divider */}
      <div className="h-px w-full bg-border mb-8" />
      
      {/* Paragraphs */}
      <div className="space-y-4 mb-10">
        <div className="h-4 w-full bg-surface-elevated rounded" />
        <div className="h-4 w-full bg-surface-elevated rounded" />
        <div className="h-4 w-5/6 bg-surface-elevated rounded" />
      </div>
      
      {/* Code block skeleton */}
      <div className="h-48 w-full bg-surface rounded-xl border border-border mb-10" />
      
      {/* More paragraphs */}
      <div className="space-y-4">
        <div className="h-4 w-full bg-surface-elevated rounded" />
        <div className="h-4 w-11/12 bg-surface-elevated rounded" />
        <div className="h-4 w-full bg-surface-elevated rounded" />
      </div>
    </div>
  );
}
