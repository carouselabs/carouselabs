"use client"

// Dark-themed recharts wrappers for the admin panel.
// Categorical palette validated for CVD + contrast on the #1A1A1A card
// surface (fixed assignment order — never cycled):
//   violet #8B5CF6 → teal #0D9488 → amber #D97706
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

export const CHART_COLORS = {
  violet: "#8B5CF6",
  teal: "#0D9488",
  amber: "#D97706",
} as const

const AXIS = { fill: "#8A8A8A", fontSize: 11 }
const GRID = "#2A2A2A"

const tooltipStyle = {
  backgroundColor: "#1F1F1F",
  border: "1px solid #2A2A2A",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
}

// Accepts unknown because recharts types tooltip labels as ReactNode.
function shortDate(d: unknown): string {
  const s = String(d ?? "")
  const dt = new Date(s)
  return isNaN(dt.getTime())
    ? s
    : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AdminLineChart({
  data,
  xKey,
  series,
  height = 240,
}: {
  data: Record<string, unknown>[]
  xKey: string
  series: { key: string; label: string; color: string }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={shortDate} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} cursor={{ stroke: GRID }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#B0B0B0" }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "#1A1A1A", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AdminBarChart({
  data,
  xKey,
  yKey,
  label,
  color = CHART_COLORS.violet,
  height = 240,
}: {
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  label: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={shortDate} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} cursor={{ fill: "#232323" }} />
        <Bar dataKey={yKey} name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Donut for the posts-by-type breakdown. Slices keep a 2px surface-color
// stroke so adjacent fills never touch; identity is doubled up in the legend.
export function AdminDonut({
  data,
  height = 240,
}: {
  data: { name: string; value: number; color: string }[]
  height?: number
}) {
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          stroke="#1A1A1A"
          strokeWidth={2}
          label={({ name, value }) =>
            total > 0 ? `${name} ${Math.round(((value as number) / total) * 100)}%` : name
          }
          labelLine={{ stroke: GRID }}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#B0B0B0" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
