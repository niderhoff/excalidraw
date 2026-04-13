import {
  DiagramToCodePlugin,
  getTextFromElements,
  TTDDialog,
  TTDStreamFetch,
} from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { TTDIndexedDBAdapter } from "../data/TTDStorage";

export const AIComponents = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  return (
    <>
      <DiagramToCodePlugin
        generate={async ({ children }) => {
          const appState = excalidrawAPI.getAppState();
          const textFromFrameChildren = getTextFromElements(children);

          // Use our server proxy (which calls OpenAI)
          const response = await fetch("/api/ai/text-to-diagram", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: `Convert this diagram to HTML/CSS code. The diagram contains these texts: ${textFromFrameChildren}. Theme: ${appState.theme}.`,
                },
              ],
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Generation failed");
          }

          const text = await response.text();
          return { html: `<html><body><pre>${text}</pre></body></html>` };
        }}
      />

      <TTDDialog
        onTextSubmit={async (props) => {
          const { onChunk, onStreamCreated, signal, messages } = props;

          // Use our server proxy instead of Excalidraw's AI backend
          const result = await TTDStreamFetch({
            url: "/api/ai/text-to-diagram",
            messages,
            onChunk,
            onStreamCreated,
            extractRateLimits: false,
            signal,
          });

          return result;
        }}
        persistenceAdapter={TTDIndexedDBAdapter}
      />
    </>
  );
};
