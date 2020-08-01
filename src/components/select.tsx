import React from "react";
import cx from "classnames";
import styles from "./select.module.scss";

interface SelectProps {
  children: React.ReactElement | React.ReactChildren;
  className?: string;
  id: string;
  initialValue?: string;
  label?: string;
  onChange?(event: React.ChangeEvent<HTMLSelectElement>): void;
}

export function Select({
  children,
  className = "",
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
