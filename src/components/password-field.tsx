"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  name = "password",
  label = "Password",
  fresh = false,
}: {
  name?: string;
  label?: string;
  fresh?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={fresh ? 12 : undefined}
          maxLength={128}
          autoComplete={fresh ? "new-password" : "current-password"}
          aria-describedby={
            fresh && name === "password" ? `${id}-help` : undefined
          }
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {fresh && name === "password" && (
        <div id={`${id}-help`} className="password-help">
          <span className="small muted">
            Use 12–128 characters. A long, unique passphrase or a password
            manager works well.
          </span>
          <div className="strength-track" aria-hidden="true">
            <span
              style={{
                width: `${value.length >= 20 ? 100 : value.length >= 16 ? 75 : value.length >= 12 ? 50 : value.length ? 25 : 0}%`,
              }}
            />
          </div>
          <span className="small" aria-live="polite">
            {!value
              ? "Paste and securely generated passwords are welcome."
              : value.length < 12
                ? `${12 - value.length} more characters needed.`
                : value.length < 16
                  ? "Minimum length met. More length adds protection."
                  : "Good length. Use a password you haven’t used elsewhere."}
          </span>
        </div>
      )}
    </div>
  );
}
