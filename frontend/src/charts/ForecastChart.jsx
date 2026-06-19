import * as d3 from "d3";
import { useD3 } from "./useD3.js";
import { ACCENT, MONO, shortMonth } from "../theme.js";

// History line + dashed projection into next month with a prediction band
export default function ForecastChart({ forecast }) {
  const ref = useD3(
    (el, width) => {
      if (!forecast) return;

      const hist = forecast.history.map((h, i) => ({
        i,
        short: shortMonth(h.month),
        value: h.expense,
      }));

      const all = hist.concat([
        {
          i: hist.length,
          short: shortMonth(forecast.next_month),
          value: forecast.pred,
          forecast: true,
        },
      ]);

      const W = Math.max(width, 360),
        H = 240,
        m = { t: 14, r: 16, b: 24, l: 50 };

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", MONO);

      const x = d3
        .scaleLinear()
        .domain([0, all.length - 1])
        .range([m.l, W - m.r]);

      const ymax = d3.max(all, (d) => d.value) * 1.15,
        ymin = d3.min(all, (d) => d.value) * 0.8;

      const y = d3
        .scaleLinear()
        .domain([ymin, ymax])
        .range([H - m.b, m.t]);

      y.ticks(4).forEach((tk) => {
        svg
          .append("line")
          .attr("x1", m.l)
          .attr("x2", W - m.r)
          .attr("y1", y(tk))
          .attr("y2", y(tk))
          .attr("stroke", "#eeeee8");

        svg
          .append("text")
          .attr("x", m.l - 8)
          .attr("y", y(tk))
          .attr("dy", "0.32em")
          .attr("text-anchor", "end")
          .attr("fill", "#b4b4aa")
          .attr("font-size", 9)
          .text("RM" + d3.format(".2s")(tk));
      });

      const li = hist.length - 1;

      const b = [
        { x: x(li), lo: y(hist[li].value), hi: y(hist[li].value) },
        { x: x(li + 1), lo: y(forecast.low), hi: y(forecast.high) },
      ];

      svg
        .append("path")
        .attr(
          "d",
          `M${b[0].x},${b[0].hi} L${b[1].x},${b[1].hi} L${b[1].x},${b[1].lo} L${b[0].x},${b[0].lo} Z`
        )
        .attr("fill", ACCENT)
        .attr("opacity", 0.13);

      const lineH = d3
        .line()
        .x((d) => x(d.i))
        .y((d) => y(d.value))
        .curve(d3.curveMonotoneX);

      svg
        .append("path")
        .datum(hist)
        .attr("d", lineH)
        .attr("fill", "none")
        .attr("stroke", ACCENT)
        .attr("stroke-width", 2.5);

      svg
        .append("path")
        .attr(
          "d",
          `M${x(li)},${y(hist[li].value)} L${x(li + 1)},${y(forecast.pred)}`
        )
        .attr("stroke", ACCENT)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5 4")
        .attr("fill", "none");

      svg
        .append("g")
        .selectAll("circle")
        .data(hist)
        .join("circle")
        .attr("cx", (d) => x(d.i))
        .attr("cy", (d) => y(d.value))
        .attr("r", 2.6)
        .attr("fill", ACCENT);

      svg
        .append("circle")
        .attr("cx", x(li + 1))
        .attr("cy", y(forecast.pred))
        .attr("r", 4.5)
        .attr("fill", "#fff")
        .attr("stroke", ACCENT)
        .attr("stroke-width", 2.5);

      all.forEach((d, i) => {
        if (i % 2 === 0 || i === all.length - 1)
          svg
            .append("text")
            .attr("x", x(d.i))
            .attr("y", H - 7)
            .attr("text-anchor", "middle")
            .attr("fill", d.forecast ? ACCENT : "#a8a89e")
            .attr("font-size", 9)
            .attr("font-weight", d.forecast ? 600 : 400)
            .text(d.short);
      });
    },
    [forecast]
  );

  return <div ref={ref} style={{ width: "100%", marginTop: 6 }} />;
}