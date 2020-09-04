import React, { useCallback, useRef, useState } from "react";
import cx from "classnames";
import styles from "./option-list.module.scss";
import inputStyles from "./inputs.module.scss";

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
  const groupCx: string = cx(inputStyles.inputGroup, {
    [`${className}`]: Boolean(className),
  });

  const fields: React.ReactElement[] = React.Children.map(
    children as React.ReactElement[],
    (child: React.ReactElement): React.ReactElement => {
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
    <section className={groupCx}>
      <legend className={inputStyles.label}>{label}</legend>
      <fieldset id={id} ref={fieldsetRef} data-action={action}>
        {fields}
      </fieldset>
      <small>{infoText}</small>
    </section>
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
    <section className={wrapperCx} onClick={clickHandler}>
      <input
        data-action={action}
        ref={inputRef}
        tabIndex={1}
        checked={checked}
        type={type}
        value={String(value)}
      ></input>
      <button></button>
      <label>{children}</label>
    </section>
  );
}
