import * as d3 from "d3";
import { useD3, showTip, hideTip } from "./useD3.js";
import { ACCENT, MONO, SANS, fMoney, shortMonth } from "../theme.js";

// GitHub-style daily-spend heatmap
export default function Calendar({ daily }) {
  const ref = useD3(
    (el, width) => {
      if (!daily.length) return;

      const map = new Map(daily.map((d) => [d.date, d.amount]));
      const start = d3.min(daily, (d) => new Date(d.date));
      const end = d3.max(daily, (d) => new Date(d.date));

      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        days.push({ date: new Date(d), value: map.get(k) || 0 });
      }

      const acc = d3.interpolateRgb("#eef1ec", ACCENT);
      const avail = Math.max(width, 680);
      const firstMon = d3.timeMonday.floor(days[0].date);
      const numWeeks =
        d3.timeMonday.count(firstMon, days[days.length - 1].date) + 1;

      const labelW = 30,
        topL = 18;

      let cell = Math.floor((avail - labelW - 4) / numWeeks);
      cell = Math.max(11, Math.min(cell, 17));

      const gap = 2,
        cs = cell,
        W = labelW + numWeeks * cs + 4,
        H = topL + 7 * cs + 4;

      const arr = days
        .map((d) => d.value)
        .filter((v) => v > 0)
        .sort(d3.ascending);

      const maxV =
        d3.quantile(arr, 0.97) || d3.max(days, (d) => d.value) || 1;

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", MONO);

      const wk = (d) => d3.timeMonday.count(firstMon, d);
      const dow = (d) => (d.getDay() + 6) % 7;

      svg
        .append("g")
        .selectAll("rect")
        .data(days)
        .join("rect")
        .attr("x", (d) => labelW + wk(d.date) * cs)
        .attr("y", (d) => topL + dow(d.date) * cs)
        .attr("width", cs - gap)
        .attr("height", cs - gap)
        .attr("rx", 2.5)
        .attr("fill", (d) =>
          d.value > 0 ? acc(Math.min(d.value / maxV, 1)) : "#f3f3ee"
        )
        .on("mousemove", (e, d) =>
          showTip(
            `<b>${d.date.toLocaleDateString("en-GB", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}</b><br>${
              d.value > 0 ? fMoney(d.value) + " spent" : "no spend"
            }`,
            e
          )
        )
        .on("mouseleave", hideTip);

      ["Mon", "", "Wed", "", "Fri", "", "Sun"].forEach((lab, i) => {
        if (lab)
          svg
            .append("text")
            .attr("x", labelW - 7)
            .attr("y", topL + i * cs + cs / 2)
            .attr("dy", "0.32em")
            .attr("text-anchor", "end")
            .attr("fill", "#b4b4aa")
            .attr("font-size", 9)
            .text(lab);
      });

      let lastMo = -1;
      days.forEach((d) => {
        const mo = d.date.getMonth();
        if (mo !== lastMo && d.date.getDate() <= 7) {
          lastMo = mo;
          svg
            .append("text")
            .attr("x", labelW + wk(d.date) * cs)
            .attr("y", 12)
            .attr("fill", "#a8a89e")
            .attr("font-size", 9.5)
            .attr("font-family", SANS)
            .attr("font-weight", 600)
            .text(shortMonth(d.date.toISOString().slice(0, 7)));
        }
      });
    },
    [daily]
  );

  return <div ref={ref} style={{ width: "100%", overflowX: "auto" }} />;
}
