import React, { useCallback, useRef, useState } from "react";
import cx from "classnames";
import styles from "./option-group.module.scss";

interface OptionsGroupProps {
  children: React.ReactElement | React.ReactElement[];
  action?: string;
  className?: string;
  disabled?: boolean;
  label: string;
  id: string;
  infoText?: string;
  initialValue?: string | number;
  onChange?(event: CustomEvent): void;
}

export function FieldSet({
  action,
  children,
  className,
  disabled = false,
  label,
  id,
  infoText,
  onChange,
}: OptionsGroupProps) {
  const fieldsetRef: React.RefObject<HTMLFieldSetElement> = useRef(null);

  const [currentValue, setCurrentValue] = useState<string | undefined>();

  const handleFieldClick = useCallback((input: HTMLInputElement) => {
    setCurrentValue(input.value);

    const myEvent: CustomEvent = new CustomEvent("onchange", {
      detail: {
        target: input,
      },
    });
    if (onChange) onChange(myEvent);
  }, []);

  // build group classname
  const groupCx: string = cx(styles.group, {
    [`${className}`]: Boolean(className),
  });

  const fields: React.ReactElement[] = React.Children.map(
    children as React.ReactElement[],
    (child: React.ReactElement): React.ReactElement => {
      console.log(child.props.value, currentValue);
      const childValue: string = String(child.props.value);

      return React.cloneElement(child, {
        action,
        disabled,
        handleClick: handleFieldClick,
        checked: Boolean(
          currentValue
            ? childValue === currentValue
            : child.props.defaultChecked
        ),
      });
    }
  );

  return (
    <div className={groupCx}>
      <legend className={styles.label}>{label}</legend>
      <fieldset id={id} ref={fieldsetRef} data-action={action}>
        {fields}
      </fieldset>
      <span className={styles.info}>{infoText}</span>
    </div>
  );
}

interface FieldProps extends React.ComponentProps<"input"> {
  action?: string;
  checked?: boolean;
  handleClick?(input: HTMLInputElement): void;
}

export function Field({
  action,
  children,
  checked = false,
  disabled,
  type,
  value,
  handleClick,
}: FieldProps) {
  const inputRef: React.RefObject<HTMLInputElement> = useRef(null);

  const wrapperCx = cx(styles.inputWrapper, {
    [styles.disabled]: disabled,
    [styles.checked]: checked,
  });

  const clickHandler = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (inputRef.current && handleClick) handleClick(inputRef.current);
    },
    [handleClick, inputRef]
  );

  return (
    <div className={wrapperCx} onClick={clickHandler}>
      <input
        data-action={action}
        ref={inputRef}
        tabIndex={1}
        checked={checked}
        type={type}
        value={String(value)}
      ></input>
      <button className={styles.button}></button>
      <label className={styles.inputLabel}>{children}</label>
    </div>
  );
}
