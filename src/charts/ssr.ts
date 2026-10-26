// ECharts for Node: renders a chart option to an SVG string, for progress.svg. The picture titles
// its trend charts inside the chart, so it adds the title component the page does not load.

import { TitleComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { echarts, type ChartOption } from "./register.ts";

echarts.use([SVGRenderer, TitleComponent]);

export function renderSvg(option: ChartOption, width: number, height: number): string {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}
