import React, {
  useCallback,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import cx from "classnames";
import { ValueSlider } from "./value-slider";
import styles from "./color-component-input.module.scss";

export interface ColorComponentProps {
  bitDepth?: number;
  className?: string;
  initialValue?: number;
  onChange?: (n: number) => void;
}

export function ColorComponent({
  bitDepth = 8,
  className,
  initialValue = 0,
  onChange,
}: ColorComponentProps) {
  // state to carry computed slider offset
  const [inputValue, setInputValue] = useState<number>(0);

  // input reference object
  const inputRef: React.RefObject<HTMLInputElement> = useRef(null);

  // define a min/max range for component values to be constrained within
  const maxRange: number = Math.pow(2, bitDepth) - 1;
  const minRange: number = 0;

  // build classname string from various modules
  const containerCx: string = cx(styles.container, className);

  // callback handler for when input value changes
  const inputChangeHandler = useCallback(
    (event: React.ChangeEvent) => {
      if (inputRef.current) {
        // parse the current value
        let value: number = parseInt(inputRef.current.value) || 0;

        // limit the value to within range of min/max
        value =
          value < minRange ? minRange : value > maxRange ? maxRange : value;

        // update the element's value that is range capped.
        inputRef.current.value = String(value);

        // and store this value in state
        setInputValue(value);
      }
    },
    [inputRef, minRange, maxRange]
  );

  useEffect(() => {
    if (inputRef.current && initialValue !== undefined) {
      inputRef.current.value = String(initialValue);
    }
  }, [inputRef, initialValue]);

  useEffect(() => {
    if (onChange && inputValue) {
      onChange(inputValue);
    }
  }, [inputValue, onChange]);

  return (
    <div className={containerCx}>
      <input
        ref={inputRef}
        type="number"
        min="0"
        max={maxRange}
        onChange={inputChangeHandler}
      ></input>
      <ValueSlider
        className={styles.slider}
        offset={inputValue / maxRange}
      ></ValueSlider>
    </div>
  );
}
