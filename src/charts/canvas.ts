// ECharts for the browser: canvas draws thousands of tiles faster than SVG nodes.

import { CanvasRenderer } from "echarts/renderers";
import { echarts } from "./register.ts";

echarts.use([CanvasRenderer]);

export { echarts };
