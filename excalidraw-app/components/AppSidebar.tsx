import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { presentationIcon } from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";

import { PresentationSidebar } from "../presentation/PresentationSidebar";

import "./AppSidebar.scss";

export const AppSidebar = () => {
  const { openSidebar } = useUIAppState();

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="presentation"
          style={{ opacity: openSidebar?.tab === "presentation" ? 1 : 0.4 }}
        >
          {presentationIcon}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="presentation" className="px-3">
        <PresentationSidebar />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
