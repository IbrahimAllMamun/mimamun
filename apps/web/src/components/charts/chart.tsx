import { useId } from "react";
import {
  extent,
  formatNumber,
  linearScale,
  niceTicks,
  type ChartBlockData,
} from "@portfolio/shared";

/**
 * Accessible SVG charts rendered on the server (no client JavaScript).
 *  - role="img" with <title>/<desc>, plus a "View data" table alternative
 *  - every series has a second encoding: dash pattern and marker shape
 *  - lines are labelled directly at their end; a legend is always shown
 *  - geometry is drawn twice (compact for phones, wide otherwise) so type
 *    stays legible without client-side measurement
 */

const SERIES = [
  { color: "var(--chart-1)", dash: "", marker: "circle" },
  { color: "var(--chart-2)", dash: "6 4", marker: "square" },
  { color: "var(--chart-3)", dash: "2 3", marker: "triangle" },
  { color: "var(--chart-4)", dash: "8 3 2 3", marker: "diamond" },
  { color: "var(--chart-5)", dash: "12 4", marker: "cross" },
  { color: "var(--chart-6)", dash: "3 6", marker: "plus" },
] as const;

type Marker = (typeof SERIES)[number]["marker"];

function MarkerShape({ kind, x, y, size, color }: { kind: Marker; x: number; y: number; size: number; color: string }) {
  const r = size / 2;
  switch (kind) {
    case "square":
      return <rect x={x - r} y={y - r} width={size} height={size} fill={color} />;
    case "triangle":
      return <path d={`M${x},${y - r * 1.15} L${x + r * 1.1},${y + r * 0.85} L${x - r * 1.1},${y + r * 0.85} Z`} fill={color} />;
    case "diamond":
      return <path d={`M${x},${y - r * 1.25} L${x + r * 1.1},${y} L${x},${y + r * 1.25} L${x - r * 1.1},${y} Z`} fill={color} />;
    case "cross":
      return (
        <path d={`M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`} stroke={color} strokeWidth={1.75} />
      );
    case "plus":
      return <path d={`M${x - r},${y} L${x + r},${y} M${x},${y - r} L${x},${y + r}`} stroke={color} strokeWidth={1.75} />;
    default:
      return <circle cx={x} cy={y} r={r} fill={color} />;
  }
}

interface Geometry {
  width: number;
  height: number;
  font: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

const WIDE: Geometry = { width: 640, height: 360, font: 12, margin: { top: 16, right: 96, bottom: 52, left: 56 } };
const COMPACT: Geometry = { width: 320, height: 260, font: 11, margin: { top: 14, right: 16, bottom: 48, left: 44 } };

function ChartSvg({ chart, geometry, titleId, descId }: { chart: ChartBlockData; geometry: Geometry; titleId: string; descId: string }) {
  const { width, height, margin, font } = geometry;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const { x: xs, series } = chart.data;
  const numericX = chart.chartType !== "bar" && xs.every((value) => typeof value === "number");
  const values = series.flatMap((s) => s.values);
  const [yMinRaw, yMaxRaw] = extent(values) ?? [0, 1];
  const yDomainMin = chart.chartType === "bar" || chart.chartType === "area" ? Math.min(0, yMinRaw) : yMinRaw;
  const integerValues = values.every((value) => value === null || Number.isInteger(value));
  const yTicks = niceTicks(yDomainMin, yMaxRaw, geometry === COMPACT ? 4 : 5, { integer: integerValues && chart.yFormat !== "percent" });
  const y = linearScale([yTicks.min, yTicks.max], [margin.top + innerH, margin.top]);

  let xPosition: (index: number) => number;
  let xTickLabels: { position: number; label: string }[];
  const band = innerW / Math.max(1, xs.length);
  if (numericX) {
    const [xMin, xMax] = extent(xs as number[]) ?? [0, 1];
    const xTicks = niceTicks(xMin, xMax, geometry === COMPACT ? 4 : 6);
    const x = linearScale([xTicks.min, xTicks.max], [margin.left, margin.left + innerW]);
    xPosition = (index) => x(xs[index] as number);
    xTickLabels = xTicks.values.map((value) => ({ position: x(value), label: formatNumber(value) }));
  } else {
    xPosition = (index) => margin.left + band * index + band / 2;
    const step = Math.ceil(xs.length / (geometry === COMPACT ? 4 : 8));
    xTickLabels = xs
      .map((value, index) => ({ position: xPosition(index), label: String(value), index }))
      .filter((tick) => tick.index % step === 0);
  }

  const baseline = y(Math.max(yTicks.min, 0));
  const yLabel = (value: number) => formatNumber(value, chart.yFormat);

  // Direct labels at line ends, nudged apart when series end close together.
  const endLabels = new Map<number, number>();
  if (geometry === WIDE && chart.chartType !== "scatter" && chart.chartType !== "bar") {
    const ends = series
      .map((item, index) => {
        const lastIndex = item.values.findLastIndex((value) => value !== null);
        return lastIndex < 0 ? null : { index, y: y(item.values[lastIndex] as number) };
      })
      .filter((end): end is { index: number; y: number } => end !== null)
      .sort((a, b) => a.y - b.y);
    const gap = font * 1.3;
    for (let i = 1; i < ends.length; i += 1) {
      const previous = ends[i - 1]!;
      const current = ends[i]!;
      if (current.y - previous.y < gap) current.y = previous.y + gap;
    }
    for (const end of ends) endLabels.set(end.index, end.y);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className="h-auto w-full overflow-visible font-mono"
      style={{ fontSize: font }}
    >
      <title id={titleId}>{chart.title}</title>
      <desc id={descId}>{chart.description}</desc>
      {/* Horizontal gridlines and y axis */}
      <g aria-hidden>
        {yTicks.values.map((tick) => (
          <g key={tick}>
            <line x1={margin.left} x2={margin.left + innerW} y1={y(tick)} y2={y(tick)} stroke="var(--rule)" strokeWidth={1} />
            <text x={margin.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fill="var(--ink-3)">
              {yLabel(tick)}
            </text>
          </g>
        ))}
        <line x1={margin.left} x2={margin.left + innerW} y1={baseline} y2={baseline} stroke="var(--ink)" strokeWidth={1} />
        {xTickLabels.map((tick) => (
          <text key={`${tick.position}-${tick.label}`} x={tick.position} y={margin.top + innerH + font + 8} textAnchor="middle" fill="var(--ink-3)">
            {tick.label.length > 14 ? `${tick.label.slice(0, 13)}…` : tick.label}
          </text>
        ))}
        {chart.xLabel ? (
          <text x={margin.left + innerW / 2} y={height - 6} textAnchor="middle" fill="var(--ink-2)">
            {chart.xLabel}
          </text>
        ) : null}
        {chart.yLabel ? (
          <text
            transform={`translate(${font + 2}, ${margin.top + innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="var(--ink-2)"
          >
            {chart.yLabel}
          </text>
        ) : null}
        {chart.referenceLine === "diagonal" ? (
          <line
            x1={xPosition(0)}
            y1={y(yTicks.min)}
            x2={margin.left + innerW}
            y2={y(yTicks.max)}
            stroke="var(--ink-3)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        ) : null}
      </g>

      {/* Data */}
      <g>
        {series.map((item, seriesIndex) => {
          const style = SERIES[seriesIndex % SERIES.length]!;
          if (chart.chartType === "bar") {
            const groupWidth = band * 0.72;
            const barWidth = groupWidth / series.length;
            return (
              <g key={item.name} aria-hidden>
                {item.values.map((value, index) => {
                  if (value === null) return null;
                  const x0 = margin.left + band * index + (band - groupWidth) / 2 + barWidth * seriesIndex;
                  const top = Math.min(y(value), baseline);
                  const barHeight = Math.abs(baseline - y(value));
                  return (
                    <rect
                      key={index}
                      className="reveal-column"
                      x={x0 + 1}
                      y={top}
                      width={Math.max(1, barWidth - 2)}
                      height={barHeight}
                      fill={style.color}
                      fillOpacity={seriesIndex === 0 ? 1 : 0.85}
                    />
                  );
                })}
              </g>
            );
          }
          const points = item.values
            .map((value, index) => (value === null ? null : { x: xPosition(index), y: y(value) }))
            .filter((point): point is { x: number; y: number } => point !== null);
          if (points.length === 0) return null;
          const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
          const last = points[points.length - 1]!;
          return (
            <g key={item.name} aria-hidden>
              {chart.chartType === "area" ? (
                <path
                  d={`${path} L${last.x.toFixed(1)},${baseline} L${points[0]!.x.toFixed(1)},${baseline} Z`}
                  fill={style.color}
                  fillOpacity={0.12}
                />
              ) : null}
              {chart.chartType !== "scatter" ? (
                <path
                  className="reveal-line"
                  pathLength={1}
                  d={path}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={2}
                  strokeDasharray={style.dash || undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {points.length <= 40 || chart.chartType === "scatter"
                ? points.map((point, index) => (
                    <MarkerShape key={index} kind={style.marker} x={point.x} y={point.y} size={chart.chartType === "scatter" ? 7 : 6} color={style.color} />
                  ))
                : null}
              {endLabels.has(seriesIndex) ? (
                <text x={last.x + 8} y={endLabels.get(seriesIndex)} dy="0.32em" fill={style.color} fontWeight={500}>
                  {item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function Chart({ chart, figureNumber }: { chart: ChartBlockData; figureNumber?: number }) {
  const id = useId().replace(/:/g, "");
  const legend = chart.data.series.map((series, index) => ({ name: series.name, style: SERIES[index % SERIES.length]! }));
  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1">
        <p className="label">{figureNumber ? `Fig. ${figureNumber}` : "Figure"}</p>
        <p className="font-serif text-lg text-ink">{chart.title}</p>
      </figcaption>
      <div className="hidden sm:block">
        <ChartSvg chart={chart} geometry={WIDE} titleId={`${id}-t`} descId={`${id}-d`} />
      </div>
      <div className="sm:hidden">
        <ChartSvg chart={chart} geometry={COMPACT} titleId={`${id}-tc`} descId={`${id}-dc`} />
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Legend">
        {legend.map(({ name, style }) => (
          <li key={name} className="inline-flex items-center gap-2">
            <svg width="28" height="10" aria-hidden className="shrink-0 overflow-visible">
              {chart.chartType === "bar" ? (
                <rect x="4" y="0" width="20" height="10" fill={style.color} />
              ) : (
                <>
                  <line x1="0" x2="28" y1="5" y2="5" stroke={style.color} strokeWidth="2" strokeDasharray={style.dash || undefined} />
                  <MarkerShape kind={style.marker} x={14} y={5} size={6} color={style.color} />
                </>
              )}
            </svg>
            {name}
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-2">{chart.description}</p>
      {chart.source ? <p className="label normal-case tracking-normal">Source: {chart.source}</p> : null}
      <details className="group text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-primary underline decoration-1 underline-offset-4">
          View data as a table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-y-2 border-ink text-left font-mono text-xs tabular-nums">
            <caption className="sr-only">{chart.title}</caption>
            <thead>
              <tr className="border-b border-ink">
                <th scope="col" className="py-1.5 pr-4 font-medium">
                  {chart.xLabel || "x"}
                </th>
                {chart.data.series.map((series) => (
                  <th key={series.name} scope="col" className="py-1.5 pr-4 text-right font-medium">
                    {series.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.x.map((xValue, row) => (
                <tr key={`${xValue}-${row}`} className="border-t border-rule">
                  <th scope="row" className="py-1 pr-4 font-normal">
                    {String(xValue)}
                  </th>
                  {chart.data.series.map((series) => {
                    const value = series.values[row];
                    return (
                      <td key={series.name} className="py-1 pr-4 text-right">
                        {value === null || value === undefined ? "—" : formatNumber(value, chart.yFormat)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
