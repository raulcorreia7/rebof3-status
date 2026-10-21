// ECharts for Node: renders a chart option to an SVG string, for progress.svg and the tests.

import { SVGRenderer } from "echarts/renderers";
import { echarts, type ChartOption } from "./register.ts";

echarts.use([SVGRenderer]);

export function renderSvg(option: ChartOption, width: number, height: number): string {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}
