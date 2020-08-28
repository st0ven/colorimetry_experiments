import React from "react";
import cx from "classnames";
import styles from "./select.module.scss";

interface SelectProps {
  children: React.ReactElement | React.ReactElement[] | React.ReactChildren;
  className?: string;
  disabled?: boolean;
  id: string;
  initialValue?: string | number;
  label?: string;
  onChange?(event: React.ChangeEvent<HTMLSelectElement>): void;
}

export function Select({
  children,
  className = "",
  disabled = false,
  id,
  initialValue,
  label,
  onChange,
}: SelectProps) {
  const selectCx: string = cx(styles.select, {
    [className]: Boolean(className),
  });
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
        defaultValue={initialValue}
      >
        {children}
      </select>
    </aside>
  );
}
