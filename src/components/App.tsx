import { formatHash, type Route } from "../model/route.ts";
import { PageContext, useRoute, useTheme } from "../state.tsx";
import type { Model } from "../types.ts";
import { Browser } from "./Browser.tsx";
import { DataSection } from "./DataSection.tsx";
import { Groups } from "./Groups.tsx";
import { Header } from "./Header.tsx";
import { Inspector } from "./Inspector.tsx";
import { MapSection } from "./MapSection.tsx";
import { QualitySection } from "./QualitySection.tsx";
import { SdkSection } from "./SdkSection.tsx";
import { Summary } from "./Summary.tsx";
import { TrendSection } from "./TrendSection.tsx";
import { FOOT } from "../strings.ts";

export function App({ model }: { model: Model }) {
  const [route, go] = useRoute();
  const theme = useTheme();
  const href = (patch: Partial<Route>) => formatHash({ ...route, ...patch }) || "#";
  const open = route.view.kind !== "home";
  return (
    <PageContext.Provider value={{ model, route, go, href, ...theme }}>
      <a class="skip" href="#overview" onClick={(event) => { event.preventDefault(); document.getElementById("overview")?.focus(); }}>
        Skip to the overview
      </a>
      <div class={`layout${open ? " with-panel" : ""}`}>
        <main id="content">
          <Header />
          <Summary />
          <Groups />
          <MapSection />
          <SdkSection />
          <DataSection />
          <QualitySection />
          <TrendSection />
          <Browser />
          <p class="small mute">
            {FOOT.generated} <a href="progress.json">progress.json</a>
            {FOOT.doNotEdit}
          </p>
        </main>
        <Inspector />
      </div>
    </PageContext.Provider>
  );
}
