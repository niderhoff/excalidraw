import { useEffect, useRef, useState, useCallback } from "react";
import { exportToCanvas } from "@excalidraw/excalidraw";

import type {
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import "./presentation.scss";

export const PresentationMode = ({
  elements,
  files,
  slides,
  startIndex,
  onExit,
}: {
  elements: readonly NonDeletedExcalidrawElement[];
  files: BinaryFiles;
  slides: ExcalidrawFrameLikeElement[];
  startIndex: number;
  onExit: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [transitioning, setTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slideCount = slides.length;
  const currentSlide = slides[currentIndex];

  // Render current slide to canvas
  useEffect(() => {
    if (!currentSlide || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    setTransitioning(true);

    exportToCanvas({
      elements: elements as any,
      appState: { exportBackground: true } as any,
      files,
      exportPadding: 0,
      exportingFrame: currentSlide,
      getDimensions: (width: number, height: number) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scale = Math.min(vw / width, vh / height, 2);
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
        canvasRef.current.width = renderedCanvas.width;
        canvasRef.current.height = renderedCanvas.height;
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(renderedCanvas, 0, 0);
        }
        // Short delay for crossfade
        requestAnimationFrame(() => {
          if (!cancelled) {
            setTransitioning(false);
          }
        });
      })
      .catch((err) => {
        console.error("Failed to render slide:", err);
        if (!cancelled) {
          setTransitioning(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentSlide, elements, files]);

  // Navigation
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slideCount - 1));
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "Enter":
        case "PageDown":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          onExit();
          break;
        case "Home":
          e.preventDefault();
          setCurrentIndex(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentIndex(slideCount - 1);
          break;
        default:
          // Number keys: jump to slide
          if (/^\d$/.test(e.key)) {
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= slideCount) {
              setCurrentIndex(num - 1);
            }
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onExit, slideCount]);

  // Click to advance
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't advance if clicking controls
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      goNext();
    },
    [goNext],
  );

  // Fullscreen
  useEffect(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Exit on fullscreen change (user presses Escape at browser level)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [onExit]);

  if (slideCount === 0) {
    onExit();
    return null;
  }

  return (
    <div className="presentation-mode" ref={containerRef} onClick={handleClick}>
      <div className="presentation-mode__canvas-wrapper">
        <canvas
          ref={canvasRef}
          className={`presentation-mode__canvas ${
            transitioning ? "presentation-mode__canvas--hidden" : ""
          }`}
        />
      </div>

      <div className="presentation-mode__controls">
        <button
          className="presentation-mode__nav-btn"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          ◀
        </button>
        <span className="presentation-mode__counter">
          {currentIndex + 1} / {slideCount}
        </span>
        <button
          className="presentation-mode__nav-btn"
          onClick={goNext}
          disabled={currentIndex === slideCount - 1}
        >
          ▶
        </button>
      </div>

      <button className="presentation-mode__exit-btn" onClick={onExit}>
        Exit (Esc)
      </button>
    </div>
  );
};
