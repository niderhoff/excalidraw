import { useEffect, useRef, useState, useCallback } from "react";
import { exportToCanvas } from "@excalidraw/excalidraw";
import { jsPDF } from "jspdf";

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
  const [darkMode, setDarkMode] = useState(false);
  const [laserOn, setLaserOn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const laserRef = useRef<HTMLDivElement>(null);

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
        const dpr = window.devicePixelRatio || 1;
        const fitScale = Math.min(vw / width, vh / height);
        const scale = fitScale * dpr;
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
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.style.width = `${renderedCanvas.width / dpr}px`;
        canvasRef.current.style.height = `${renderedCanvas.height / dpr}px`;
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

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".presentation-mode__toolbar")) {
        return;
      }
      goNext();
    },
    [goNext],
  );

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) {
      return;
    }
    const link = document.createElement("a");
    link.download = `slide-${currentIndex + 1}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, [currentIndex]);

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (exportingPdf) {
      return;
    }
    setExportingPdf(true);
    try {
      // Render all slides, determine PDF orientation from first slide
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

  // Laser pointer follows mouse
  useEffect(() => {
    if (!laserOn) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (laserRef.current) {
        laserRef.current.style.left = `${e.clientX}px`;
        laserRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [laserOn]);

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
      onClick={handleClick}
    >
      {laserOn && <div ref={laserRef} className="presentation-mode__laser" />}
      <div
        className={`presentation-mode__canvas-wrapper ${
          laserOn ? "presentation-mode__canvas-wrapper--laser" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          className={`presentation-mode__canvas ${
            transitioning ? "presentation-mode__canvas--hidden" : ""
          }`}
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
          onClick={() => setLaserOn((l) => !l)}
          aria-label="Toggle laser pointer"
          title="Laser pointer"
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
