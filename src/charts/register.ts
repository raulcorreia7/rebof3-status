// The ECharts parts the page uses. Importing from echarts/core and naming the parts keeps the
// bundle to what is drawn; the renderer is added by canvas.ts.

import { TreemapChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";

echarts.use([TreemapChart, TooltipComponent]);

export { echarts };
export type { EChartsCoreOption as ChartOption } from "echarts/core";
