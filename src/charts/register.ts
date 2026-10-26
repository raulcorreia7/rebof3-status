// The ECharts parts the page uses. Importing from echarts/core and naming the parts keeps the
// bundle to what is drawn; the renderer is added by canvas.ts (browser) or ssr.ts (Node).

import { LineChart, TreemapChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";

echarts.use([TreemapChart, LineChart, GridComponent, TooltipComponent]);

export { echarts };
export type { EChartsCoreOption as ChartOption } from "echarts/core";
