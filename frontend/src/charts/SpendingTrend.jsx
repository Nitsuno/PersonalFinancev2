import * as d3 from "d3";
import { useD3, showTip, hideTip } from "./useD3.js";
import { ACCENT, MONO, SANS, fMoney, fSigned, monthLabel, shortMonth } from "../theme.js";

// Net-balance line over diverging income (up) / expense (down) bars, shared x-axis
export default function SpendingTrend({ monthly }) {
  const ref = useD3(
    (el, width) => {
      const data = monthly;
      if (!data.length) return;

      const W = Math.max(width, 600);
      const m = { t: 22, r: 18, l: 62 };

      const topH = 128,
        botH = 104,
        midGap = 20;

      const H = m.t + topH + midGap + botH + 24;

      const svg = d3
        .select(el)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("font-family", MONO);

      const xb = d3
        .scaleBand()
        .domain(data.map((d) => d.month))
        .range([m.l, W - m.r])
        .padding(0.42);

      const cx = (d) => xb(d.month) + xb.bandwidth() / 2;

      const balExt = d3.extent(data, (d) => d.balance);

      const yTop = d3
        .scaleLinear()
        .domain([Math.min(balExt[0] * 0.9, 0), balExt[1] * 1.08])
        .range([m.t + topH, m.t]);

      yTop.ticks(4).forEach((tk) => {
        svg
          .append("line")
          .attr("x1", m.l)
          .attr("x2", W - m.r)
          .attr("y1", yTop(tk))
          .attr("y2", yTop(tk))
          .attr("stroke", "#eeeee8");

        svg
          .append("text")
          .attr("x", m.l - 9)
          .attr("y", yTop(tk))
          .attr("dy", "0.32em")
          .attr("text-anchor", "end")
          .attr("fill", "#b4b4aa")
          .attr("font-size", 9.5)
          .text("RM" + d3.format(".2s")(tk));
      });

      svg
        .append("text")
        .attr("x", m.l)
        .attr("y", 13)
        .attr("fill", "#9a9a90")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .attr("font-family", SANS)
        .text("NET BALANCE");

      const area = d3
        .area()
        .x(cx)
        .y0(m.t + topH)
        .y1((d) => yTop(d.balance))
        .curve(d3.curveMonotoneX);

      const line = d3
        .line()
        .x(cx)
        .y((d) => yTop(d.balance))
        .curve(d3.curveMonotoneX);

      svg
        .append("path")
        .datum(data)
        .attr("d", area)
        .attr("fill", ACCENT)
        .attr("opacity", 0.09);

      const p = svg
        .append("path")
        .datum(data)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", ACCENT)
        .attr("stroke-width", 2.5)
        .attr("stroke-linejoin", "round");

      const L = p.node().getTotalLength();

      p.attr("stroke-dasharray", L)
        .attr("stroke-dashoffset", L)
        .transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      svg
        .append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", cx)
        .attr("cy", (d) => yTop(d.balance))
        .attr("r", 3)
        .attr("fill", "#fff")
        .attr("stroke", ACCENT)
        .attr("stroke-width", 2);

      const botTop = m.t + topH + midGap,
        mid = botTop + botH / 2;

      const maxIO = d3.max(data, (d) => Math.max(d.income, d.expense)) || 1;

      const yB = d3
        .scaleLinear()
        .domain([0, maxIO * 1.04])
        .range([0, botH / 2 - 4]);

      svg
        .append("line")
        .attr("x1", m.l)
        .attr("x2", W - m.r)
        .attr("y1", mid)
        .attr("y2", mid)
        .attr("stroke", "#dadad2");

      const bw = Math.min(xb.bandwidth() / 2 - 2, 13);

      svg
        .append("g")
        .selectAll("rect.i")
        .data(data)
        .join("rect")
        .attr("x", (d) => cx(d) - bw - 1)
        .attr("width", bw)
        .attr("y", (d) => mid - yB(d.income))
        .attr("height", (d) => yB(d.income))
        .attr("rx", 2)
        .attr("fill", ACCENT)
        .attr("opacity", 0.85);

      svg
        .append("g")
        .selectAll("rect.e")
        .data(data)
        .join("rect")
        .attr("x", (d) => cx(d) + 1)
        .attr("width", bw)
        .attr("y", mid)
        .attr("height", (d) => yB(d.expense))
        .attr("rx", 2)
        .attr("fill", "#d98a6a");

      svg
        .append("g")
        .selectAll("text.mo")
        .data(data)
        .join("text")
        .attr("x", cx)
        .attr("y", H - 7)
        .attr("text-anchor", "middle")
        .attr("fill", "#a8a89e")
        .attr("font-size", 9.5)
        .text((d) => shortMonth(d.month));

      svg
        .append("g")
        .selectAll("rect.h")
        .data(data)
        .join("rect")
        .attr("x", (d) => xb(d.month))
        .attr("y", m.t)
        .attr("width", xb.bandwidth())
        .attr("height", H - m.t - 24)
        .attr("fill", "transparent")
        .on("mousemove", (e, d) =>
          showTip(
            `<b>${monthLabel(d.month)}</b><br>in &nbsp;${fMoney(
              d.income
            )}<br>out ${fMoney(d.expense)}<br>net ${fSigned(
              d.net
            )}<br>bal ${fMoney(d.balance)}`,
            e
          )
        )
        .on("mouseleave", hideTip);
    },
    [monthly]
  );

  return <div ref={ref} style={{ width: "100%" }} />;
}