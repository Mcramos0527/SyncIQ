'use client';

import type { DailyPoint } from './ComputeOverviewKpis';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const INDIGO_600 = '#4f46e5';

export const PlatformChart = (props: {
  title: string;
  data: DailyPoint[];
  formatValue?: (value: number) => string;
}) => {
  const formatValue = props.formatValue ?? (value => value.toLocaleString());

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm font-medium">{props.title}</p>

      {props.data.length === 0
        ? (
            <div className="
              flex h-48 items-center justify-center text-xs
              text-muted-foreground
            "
            >
              No data synced yet
            </div>
          )
        : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={props.data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`${props.title}-fill`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INDIGO_600} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={INDIGO_600} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={8}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={40}
                  tickFormatter={formatValue}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={value => formatValue(Number(value))}
                  contentStyle={{
                    borderRadius: 6,
                    fontSize: 12,
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={INDIGO_600}
                  strokeWidth={2}
                  fill={`url(#${props.title}-fill)`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
    </div>
  );
};
