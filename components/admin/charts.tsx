"use client"

// Dark-themed recharts wrappers for the admin panel.
// Categorical palette validated (lightness band, chroma, colour-blind
// separation across all pairs, 3:1 contrast) on the dark card surface
// #201E1B (the design system's dark --surface). Fixed assignment order —
// never cycled: violet #8B5CF6 → teal #0D9488 → amber #D97706 → rose #E11D48.
// Anything past four folds into a neutral "Other". Chart chrome (axes, grid,
// tooltip) uses the dark theme's text and border values.
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
  rose: "#E11D48",
  /** The folded "Other" slice only — never a series of its own. */
  other: "#8A847A",
} as const

// Dark theme values (app/globals.css [data-theme="dark"]).
const SURFACE = "#201E1B"
const AXIS = { fill: "#B5AFA4", fontSize: 11 }
const GRID = "#3A352F"

const tooltipStyle = {
  backgroundColor: "#282521",
  border: "1px solid #3A352F",
  borderRadius: 10,
  fontSize: 12,
  color: "#F5F0E7",
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
  decimals = false,
}: {
  data: Record<string, unknown>[]
  xKey: string
  series: { key: string; label: string; color: string }[]
  height?: number
  // Values below 1 (dollars of AI cost): ticks with decimals.
  decimals?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickFormatter={shortDate} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={decimals} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} cursor={{ stroke: GRID }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#B5AFA4" }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }}
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
        <Tooltip contentStyle={tooltipStyle} labelFormatter={shortDate} cursor={{ fill: "#24211D" }} />
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
          stroke={SURFACE}
          strokeWidth={2}
          // Labels wear the text colour; the slice beside them carries identity.
          label={({ name, value, x, y, textAnchor }) => (
            <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="#B5AFA4" fontSize={12}>
              {total > 0 ? `${name} ${Math.round(((value as number) / total) * 100)}%` : name}
            </text>
          )}
          labelLine={{ stroke: GRID }}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#B5AFA4" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
