"use client";

import { useState } from "react";
import { Button, Icon, TextField } from "@shopify/polaris";
import { HideIcon, ViewIcon } from "@shopify/polaris-icons";

/**
 * Password field with a show/hide toggle (eye button in the suffix).
 * Mirrors the standard Polaris "reveal password" pattern.
 */
export function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete = "off",
  helpText,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  helpText?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      helpText={helpText}
      placeholder={placeholder}
      suffix={
        <Button
          variant="plain"
          onClick={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          icon={
            <Icon source={visible ? HideIcon : ViewIcon} tone="subdued" />
          }
        />
      }
    />
  );
}
