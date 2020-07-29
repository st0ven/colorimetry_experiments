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

  const [relativeOffset, setRelativeOffset] = useState<number>(offset | 0);

  // deconstruct/import interaction coordinates hook
  const { offsetX }: UseInteractionCoordinates = useInteractionCoordinates(
    handleRef
  );

  // determine classname mixins
  const sliderCx: string = cx(styles.slider, className);

  // update value to parent
  useEffect(() => {
    if (onChange) {
      onChange(offsetX);
    }
  }, [offsetX, onChange]);

  useEffect(() => {
    if (fillRef.current) {
      const { width }: ClientRect = fillRef.current.getBoundingClientRect();
      setRelativeOffset(offset * width);
    }
  }, [offsetX, offset, fillRef]);

  // render output
  return (
    <div className={sliderCx}>
      <div className={styles.fill} ref={fillRef}></div>
      <div className={styles.handle} ref={handleRef} style={{left: `${relativeOffset}px`}}></div>
    </div>
  );
}
