export const BlogSkeleton = () => (
  <div
    role="status"
    className="animate-pulse rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4"
  >
    <div className="h-44 rounded-[20px] bg-black/5" />
    <div className="px-1 py-5">
      <div className="h-3 w-20 rounded bg-black/10" />
      <div className="mt-4 h-7 w-5/6 rounded bg-black/10" />
      <div className="mt-2 h-7 w-2/3 rounded bg-black/10" />
      <div className="mt-5 h-3 w-full rounded bg-black/5" />
      <div className="mt-2 h-3 w-4/5 rounded bg-black/5" />
      <div className="mt-7 h-9 w-40 rounded-full bg-black/5" />
    </div>
    <span className="sr-only">Loading stories</span>
  </div>
);
