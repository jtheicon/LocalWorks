/** Count pill on worker dashboard tabs; hidden when zero. */
const TabCountBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tabular-nums inline-flex items-center justify-center group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground"
      aria-label={`${label} items`}
    >
      {label}
    </span>
  );
};

export default TabCountBadge;
