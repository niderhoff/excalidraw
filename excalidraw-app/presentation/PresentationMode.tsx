import { useEffect, useState, useCallback, useRef } from "react";
import { Excalidraw, exportToCanvas } from "@excalidraw/excalidraw";
import { jsPDF } from "jspdf";

import type {
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

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
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("excalidraw-theme");
    if (stored === "dark") {
      return true;
    }
    if (stored === "system") {
      return (
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
      );
    }
    return false;
  });
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [laserOn, setLaserOn] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slideCount = slides.length;
  const currentSlide = slides[currentIndex];

  const scrollToFrame = useCallback(
    (frameId: string) => {
      if (!api) {
        return;
      }
      const sceneElements = api.getSceneElements();
      const frame = sceneElements.find((el) => el.id === frameId);
      if (frame) {
        api.scrollToContent(frame, {
          fitToViewport: true,
          viewportZoomFactor: 0.95,
          animate: false,
        });
      }
    },
    [api],
  );

  // Scroll to frame when slide changes (after initial load)
  useEffect(() => {
    if (!ready || !currentSlide) {
      return;
    }
    scrollToFrame(currentSlide.id);
  }, [ready, currentSlide, scrollToFrame]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slideCount - 1));
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation — only intercept our keys, let everything else
  // (like K for laser) pass through to the Excalidraw instance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Alt+D — toggle dark mode in presentation
      if (e.shiftKey && e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        e.stopPropagation();
        setDarkMode((d) => !d);
        return;
      }
      // Don't intercept if modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          e.stopPropagation();
          goNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          e.stopPropagation();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onExit();
          break;
        case "Home":
          e.preventDefault();
          e.stopPropagation();
          setCurrentIndex(0);
          break;
        case "End":
          e.preventDefault();
          e.stopPropagation();
          setCurrentIndex(slideCount - 1);
          break;
        default:
          if (/^\d$/.test(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= slideCount) {
              setCurrentIndex(num - 1);
            }
          }
          // All other keys (K, etc.) pass through to Excalidraw
      }
    };

    // Use capture phase so we intercept before Excalidraw, but only
    // stop propagation for our specific keys
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [goNext, goPrev, onExit, slideCount]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleDownload = useCallback(() => {
    if (!api) {
      return;
    }
    // Export current frame as PNG via exportToCanvas
    exportToCanvas({
      elements: elements as any,
      appState: { exportBackground: true } as any,
      files,
      exportPadding: 0,
      exportingFrame: currentSlide,
      getDimensions: (w: number, h: number) => ({
        width: w * 2,
        height: h * 2,
        scale: 2,
      }),
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `slide-${currentIndex + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }, [api, elements, files, currentSlide, currentIndex]);

  const handleExportPdf = useCallback(async () => {
    if (exportingPdf) {
      return;
    }
    setExportingPdf(true);
    try {
      const firstSlide = slides[0];
      const landscape = firstSlide.width > firstSlide.height;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "px",
        format: [firstSlide.width, firstSlide.height],
      });

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const canvas = await exportToCanvas({
          elements: elements as any,
          appState: { exportBackground: true } as any,
          files,
          exportPadding: 0,
          exportingFrame: slide,
          getDimensions: (w: number, h: number) => ({
            width: w * 2,
            height: h * 2,
            scale: 2,
          }),
        });

        if (i > 0) {
          pdf.addPage([slide.width, slide.height], landscape ? "l" : "p");
        }

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, slide.width, slide.height);
      }

      pdf.save("presentation.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExportingPdf(false);
  }, [slides, elements, files, exportingPdf]);

  if (slideCount === 0) {
    onExit();
    return null;
  }

  return (
    <div
      className={`presentation-mode ${
        darkMode ? "presentation-mode--dark" : ""
      }`}
      ref={containerRef}
    >
      <div className="presentation-mode__excalidraw-wrapper">
        <Excalidraw
          initialData={{
            elements,
            appState: {
              viewModeEnabled: true,
              theme: darkMode ? "dark" : "light",
              zenModeEnabled: true,
              frameRendering: {
                enabled: true,
                name: false,
                outline: false,
                clip: true,
              },
            },
            files,
          }}
          viewModeEnabled={true}
          zenModeEnabled={true}
          handleKeyboardGlobally={true}
          theme={darkMode ? "dark" : "light"}
          onExcalidrawAPI={(a) => setApi(a)}
          onInitialize={(a) => {
            // Scene is loaded — scroll to the initial slide
            const frame = a
              .getSceneElements()
              .find((el) => el.id === slides[startIndex]?.id);
            if (frame) {
              a.scrollToContent(frame, {
                fitToViewport: true,
                viewportZoomFactor: 0.95,
                animate: false,
              });
            }
            setReady(true);
          }}
          UIOptions={{
            canvasActions: {
              export: false,
              toggleTheme: false,
            },
          }}
        />
      </div>

      <div className="presentation-mode__toolbar">
        <button
          className="presentation-mode__tool-btn"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="presentation-mode__counter">
          Slide {currentIndex + 1}/{slideCount}
        </span>
        <button
          className="presentation-mode__tool-btn"
          onClick={goNext}
          disabled={currentIndex === slideCount - 1}
          aria-label="Next slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <div className="presentation-mode__separator" />

        <button
          className={`presentation-mode__tool-btn ${
            laserOn ? "presentation-mode__tool-btn--active" : ""
          }`}
          onClick={() => {
            if (api) {
              const next = !laserOn;
              api.setActiveTool(next ? { type: "laser" } : { type: "hand" });
              setLaserOn(next);
            }
          }}
          aria-label="Toggle laser pointer (K)"
          title="Laser pointer (K)"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </button>
        <button
          className="presentation-mode__tool-btn"
          onClick={() => setDarkMode((d) => !d)}
          aria-label="Toggle dark mode"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </button>
        <button
          className="presentation-mode__tool-btn"
          onClick={handleDownload}
          aria-label="Download slide as PNG"
          title="Download slide (PNG)"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
        <button
          className="presentation-mode__tool-btn"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          aria-label="Export all slides as PDF"
          title="Export PDF"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </button>
        <button
          className="presentation-mode__tool-btn"
          onClick={handleFullscreen}
          aria-label="Toggle fullscreen"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
