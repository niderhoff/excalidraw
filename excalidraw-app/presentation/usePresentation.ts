import { useState, useMemo, useCallback } from "react";
import { isFrameLikeElement } from "@excalidraw/element/typeChecks";

import type {
  ExcalidrawFrameLikeElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

/**
 * Extracts frames from elements and sorts them spatially:
 * left-to-right, then top-to-bottom (with row tolerance).
 */
export function getOrderedSlides(
  elements: readonly NonDeletedExcalidrawElement[],
): ExcalidrawFrameLikeElement[] {
  const frames = elements.filter(
    (el): el is ExcalidrawFrameLikeElement =>
      isFrameLikeElement(el) && !el.isDeleted,
  );

  const ROW_TOLERANCE = 100; // pixels — frames within this Y-range are same row

  return frames.sort((a, b) => {
    const rowDiff = a.y - b.y;
    if (Math.abs(rowDiff) > ROW_TOLERANCE) {
      return rowDiff;
    }
    return a.x - b.x;
  });
}

export function usePresentation(
  elements: readonly NonDeletedExcalidrawElement[],
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);

  const slides = useMemo(() => getOrderedSlides(elements), [elements]);

  const slideCount = slides.length;
  const currentSlide = slides[currentIndex] ?? null;

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, slideCount - 1)));
    },
    [slideCount],
  );

  const nextSlide = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slideCount - 1));
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const startPresentation = useCallback(
    (startIndex = 0) => {
      setCurrentIndex(Math.max(0, Math.min(startIndex, slideCount - 1)));
      setIsPresenting(true);
    },
    [slideCount],
  );

  const stopPresentation = useCallback(() => {
    setIsPresenting(false);
  }, []);

  return {
    slides,
    slideCount,
    currentIndex,
    currentSlide,
    isPresenting,
    goToSlide,
    nextSlide,
    prevSlide,
    startPresentation,
    stopPresentation,
  };
}
