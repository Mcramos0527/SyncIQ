export const KpiTile = (props: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-lg border bg-card p-4 shadow-sm">
    <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight">{props.value}</p>
    {props.hint && (
      <p className="mt-1 truncate text-xs text-muted-foreground">{props.hint}</p>
    )}
  </div>
);
