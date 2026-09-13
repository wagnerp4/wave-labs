import { useState } from "react";
import { Sidebar } from "./components/Sidebar.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { useEngine } from "./lib/useEngine.ts";
import type { Screen } from "./lib/navigation.ts";
import { Launchpad } from "./screens/Launchpad.tsx";
import { Studio } from "./screens/Studio.tsx";
import { Transcribe } from "./screens/Transcribe.tsx";
import { Voices } from "./screens/Voices.tsx";
import { Audiobooks } from "./screens/Audiobooks.tsx";
import { Models } from "./screens/Models.tsx";
import { LocalApi } from "./screens/LocalApi.tsx";
import { Logs } from "./screens/Logs.tsx";
import { Settings } from "./screens/Settings.tsx";

export function App() {
  const [screen, setScreen] = useState<Screen>("launchpad");
  const engine = useEngine();
  const detected = engine.kind === "online" ? engine.health.hardware.detected : null;

  return (
    <div className="flex h-full bg-ink-950 text-ink-50">
      <Sidebar active={screen} onNavigate={setScreen} engine={engine} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar screen={screen} engine={engine} />
        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
          {screen === "launchpad" && <Launchpad onNavigate={setScreen} engine={engine} />}
          {screen === "studio" && <Studio engine={engine} detected={detected} />}
          {screen === "transcribe" && <Transcribe engine={engine} />}
          {screen === "voices" && <Voices />}
          {screen === "audiobooks" && <Audiobooks />}
          {screen === "models" && <Models detected={detected} />}
          {screen === "api" && <LocalApi engine={engine} />}
          {screen === "logs" && <Logs />}
          {screen === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
