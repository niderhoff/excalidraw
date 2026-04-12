import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { useExcalidrawAPI, exportToCanvas } from "@excalidraw/excalidraw";

import type { ExcalidrawFrameLikeElement } from "@excalidraw/element/types";

import { getOrderedSlides } from "./usePresentation";
import { PresentationMode } from "./PresentationMode";

import "./presentation.scss";

const SlidePreview = ({
  frame,
  elements,
  files,
}: {
  frame: ExcalidrawFrameLikeElement;
  elements: readonly any[];
  files: any;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    exportToCanvas({
      elements: elements as any,
      appState: { exportBackground: true } as any,
      files,
      exportPadding: 0,
      exportingFrame: frame,
      getDimensions: (width: number, height: number) => {
        const scale = Math.min(64 / width, 40 / height, 1);
        return {
          width: Math.ceil(width * scale),
          height: Math.ceil(height * scale),
          scale,
        };
      },
    })
      .then((renderedCanvas) => {
        if (cancelled || !canvasRef.current) {
          return;
        }
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
          return;
        }
        canvasRef.current.width = renderedCanvas.width;
        canvasRef.current.height = renderedCanvas.height;
        ctx.drawImage(renderedCanvas, 0, 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [frame, elements, files]);

  return (
    <div className="presentation-sidebar__slide-preview">
      <canvas ref={canvasRef} />
    </div>
  );
};

export const PresentationSidebar = () => {
  const excalidrawAPI = useExcalidrawAPI();
  const [_refresh, setRefresh] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  // Refresh slide list periodically as user adds frames
  useEffect(() => {
    const interval = setInterval(() => setRefresh((n) => n + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const elements = useMemo(
    () => excalidrawAPI?.getSceneElements() ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshes via setRefresh interval
    [excalidrawAPI, _refresh],
  );
  const files = excalidrawAPI?.getFiles() ?? {};
  const slides = useMemo(() => getOrderedSlides(elements), [elements]);

  const handlePresent = useCallback(
    (index = 0) => {
      if (slides.length > 0) {
        setStartIndex(index);
        setIsPresenting(true);
      }
    },
    [slides.length],
  );

  if (!excalidrawAPI) {
    return null;
  }

  return (
    <>
      <div className="presentation-sidebar">
        <div className="presentation-sidebar__header">
          <span className="presentation-sidebar__title">
            Slides ({slides.length})
          </span>
          <button
            className="presentation-sidebar__present-btn"
            onClick={() => handlePresent(0)}
            disabled={slides.length === 0}
          >
            Present
          </button>
        </div>

        {slides.length === 0 ? (
          <div className="presentation-sidebar__empty">
            <p>No frames on canvas</p>
            <p>
              Add frames (<kbd>F</kbd>) to create slides
            </p>
          </div>
        ) : (
          <div className="presentation-sidebar__slides">
            {slides.map((frame, i) => (
              <div
                key={frame.id}
                className="presentation-sidebar__slide"
                onClick={() => handlePresent(i)}
              >
                <span className="presentation-sidebar__slide-number">
                  {i + 1}
                </span>
                <SlidePreview frame={frame} elements={elements} files={files} />
                <span className="presentation-sidebar__slide-name">
                  {frame.name || `Frame ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPresenting && (
        <PresentationMode
          elements={elements}
          files={files}
          slides={slides}
          startIndex={startIndex}
          onExit={() => setIsPresenting(false)}
        />
      )}
    </>
  );
};
