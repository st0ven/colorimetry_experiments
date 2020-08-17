import React, { useEffect, useState, useRef } from "react";
import cx from "classnames";
import styles from "./value-slider.module.scss";
import {
  useInteractionCoordinates,
  UseInteractionCoordinates,
} from "../hooks/interaction-coordinates";

interface ValueSliderProps {
  className?: string;
  offset?: number;
  onChange?: (x: number | undefined) => void;
}

export function ValueSlider({
  className,
  offset = 0,
  onChange,
}: ValueSliderProps) {
  // element React refs
  const handleRef: React.RefObject<HTMLDivElement> = useRef(null);
  const fillRef: React.RefObject<HTMLDivElement> = useRef(null);
  const sliderRef: React.RefObject<HTMLDivElement> = useRef(null);

  // keep state of the relative offset of the slider handle
  const [relativeOffset, setRelativeOffset] = useState<number>(offset);

  // deconstruct/import interaction coordinates hook
  const { offsetX }: UseInteractionCoordinates = useInteractionCoordinates(
    handleRef
  );

  // determine classname mixins
  const sliderCx: string = cx(styles.slider, className);

  // update value to parent
  useEffect(() => {
    if (
      onChange &&
      offsetX !== undefined &&
      sliderRef.current &&
      fillRef.current
    ) {
      const { left }: ClientRect = sliderRef.current?.getBoundingClientRect();
      const { width }: ClientRect = fillRef.current?.getBoundingClientRect();
      const setOffsetX: number = (offsetX - left) / width;
      onChange(setOffsetX);
    }
  }, [offsetX, onChange, sliderRef, fillRef]);

  useEffect(() => {
    setRelativeOffset(offset * Math.pow(2, 8));
  }, [offset]);

  // render output
  return (
    <div className={sliderCx} ref={sliderRef}>
      <div className={styles.fill} ref={fillRef}></div>
      <div
        className={styles.handle}
        ref={handleRef}
        style={{ left: `${relativeOffset}px`, transform: `translateX(-50%)` }}
      ></div>
    </div>
  );
}
