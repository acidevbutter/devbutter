"use client";

import { cloneElement, isValidElement, useId } from "react";
import styles from "./Field.module.scss";

/**
 * Field — label, control, hint and error wired together for screen readers.
 *
 * Copy rules (design-system/docs/Voice.md): the label names the thing in
 * sentence case ("E-mail", "Nome da empresa"); the hint says what's optional
 * or expected ("opcional · usamos só pra falar do diagnóstico"); the error says
 * what to do, never that the person was wrong ("Preencha um e-mail válido.",
 * not "E-mail inválido!").
 */
type FieldProps = {
  label: React.ReactNode;
  /** Short guidance under the control. Shown even when there is an error. */
  hint?: React.ReactNode;
  /** What to fix, as an instruction. Sets aria-invalid on the control. */
  error?: React.ReactNode;
  /** Marks the label with "opcional" instead of starring the required ones. */
  optional?: boolean;
  className?: string;
  /** Exactly one control: <Input>, <Textarea>, <Select> or a native one. */
  children: React.ReactElement<React.InputHTMLAttributes<HTMLElement>>;
};

export default function Field({
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [children.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> · opcional</span>}
      </label>
      {control}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${styles.input} ${className ?? ""}`} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${styles.input} ${styles.textarea} ${className ?? ""}`} {...rest} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${styles.input} ${styles.select} ${className ?? ""}`} {...rest} />;
}
