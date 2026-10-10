export const Spinner = () => (
  <div className="flex items-center gap-3 text-sm text-[var(--muted)]" role="status">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[#3457d5]" />
    <span>Gathering the words…</span>
  </div>
);
