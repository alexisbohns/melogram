"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  ariaLabel: string;
};

export default function EditableText({
  value,
  onCommit,
  className,
  placeholder,
  multiline = false,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      contentEditable
      suppressContentEditableWarning
      className={className}
      data-placeholder={placeholder}
      style={{
        outline: "1px dashed color-mix(in srgb, var(--album-accent) 60%, transparent)",
        borderRadius: "var(--radius-button)",
        padding: "2px 6px",
        minHeight: "1em",
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
    >
      {value}
    </div>
  );
}
