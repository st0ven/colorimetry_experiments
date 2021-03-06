import React, { useState, useCallback, useLayoutEffect } from "react";

export interface UseInteractionCoordinates {
  hasInteraction: boolean;
  offsetX: number | undefined;
  offsetY: number | undefined;
}

export function useInteractionCoordinates(
  elementRef: React.RefObject<HTMLElement>
): UseInteractionCoordinates {
  // hook state
  const [hasInteraction, setHasInteraction] = useState<boolean>(false);
  const [offsets, hasOffsets] = useState<[number, number] | undefined>();

  // handler functions for dragging actions
  const handleDragStart = useCallback(
    (event: MouseEvent | TouchEvent) => {
      setHasInteraction(true);
    },
    [setHasInteraction]
  );

  // handler function for moving an element reference
  const handleDragMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (hasInteraction) {
        const { current } = elementRef;
        if (current && event instanceof MouseEvent) {
          // destructure event offsets for mouse position
          const { clientX, clientY } = event;

          // return difference of coordinates based on axis
          hasOffsets([clientX, clientY]);
        }
      }
    },
    [elementRef, hasInteraction, hasOffsets]
  );

  // handler function for terminating a drag effort
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent) => {
    setHasInteraction(false);
    hasOffsets(undefined);
  }, []);

  // register event handlers to the elementRef parameter
  useLayoutEffect(() => {
    const { current } = elementRef;
    if (current) {
      current.addEventListener("mousedown", handleDragStart);
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    }
    return () => {
      if (current) {
        current.addEventListener("mousedown", handleDragStart);
        document.addEventListener("mousemove", handleDragMove);
        document.addEventListener("mouseup", handleDragEnd);
      }
    };
  }, [elementRef, handleDragStart, handleDragMove, handleDragEnd]);

  return {
    hasInteraction,
    offsetX: hasInteraction && offsets ? offsets[0] : undefined,
    offsetY: hasInteraction && offsets ? offsets[1] : undefined,
  };
}
