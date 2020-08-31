import React from "react";
import cx from "classnames";
import styles from "./select.module.scss";

interface SelectProps {
  children: React.ReactElement | React.ReactElement[] | React.ReactChildren;
  className?: string;
  action?: string;
  disabled?: boolean;
  id: string;
  infoText?: string;
  initialValue?: string | number;
  label?: string;
  onChange?(event: React.ChangeEvent<HTMLSelectElement>): void;
}

export function Select({
  children,
  className = "",
  disabled = false,
  id,
  infoText,
  initialValue,
  label,
  action,
  onChange,
}: SelectProps) {
  // construct wrapper classname
  const selectCx: string = cx(styles.select, {
    [className]: Boolean(className),
  });
  
  // classname for informative text
  const infoCx: string = cx(styles.info, {
    disabled: Boolean(infoText)
  })

  // render component
  return (
    <aside className={selectCx}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <select
        disabled={disabled}
        id={id}
        className={styles.selector}
        onChange={onChange}
        data-action={action}
        defaultValue={initialValue}
      >
        {children}
      </select>
      <span className={infoCx}>{infoText}</span>
    </aside>
  );
}
