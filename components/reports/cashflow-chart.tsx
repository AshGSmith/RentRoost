import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/domain/utils";

export function CashflowChart({
  data,
  currencyDesignator,
  title,
  description
}: {
  data: { label: string; income: number; expense: number }[];
  currencyDesignator: string;
  title: string;
  description: string;
}) {
  const chartHeight = 240;
  const width = 760;
  const padding = 24;
  const columnWidth = Math.max((width - padding * 2) / Math.max(data.length, 1), 48);
  const barWidth = Math.max(columnWidth / 3, 12);
  const maxValue = Math.max(...data.flatMap((item) => [item.income, item.expense]), 1);

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <svg
          aria-label={title}
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${chartHeight + 48}`}
        >
          <line stroke="currentColor" strokeOpacity="0.1" x1={padding} x2={width - padding} y1={chartHeight} y2={chartHeight} />
          {data.map((point, index) => {
            const groupX = padding + index * columnWidth + columnWidth / 2;
            const incomeHeight = (point.income / maxValue) * (chartHeight - 36);
            const expenseHeight = (point.expense / maxValue) * (chartHeight - 36);

            return (
              <g key={point.label}>
                <title>
                  {`${point.label}: income ${formatCurrency(point.income, currencyDesignator)}, expense ${formatCurrency(point.expense, currencyDesignator)}`}
                </title>
                <rect
                  fill="#2563eb"
                  height={incomeHeight}
                  rx="8"
                  width={barWidth}
                  x={groupX - barWidth - 3}
                  y={chartHeight - incomeHeight}
                />
                <rect
                  fill="#ef4444"
                  height={expenseHeight}
                  rx="8"
                  width={barWidth}
                  x={groupX + 3}
                  y={chartHeight - expenseHeight}
                />
                <text
                  fill="currentColor"
                  fontSize="11"
                  textAnchor="middle"
                  x={groupX}
                  y={chartHeight + 18}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Income
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Expenses
        </span>
      </div>
    </Card>
  );
}
