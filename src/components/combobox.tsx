"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
export type Choice = { id: string; label: string };
type Page = { options: Choice[]; nextOffset?: number | null };
export function Combobox({
  label,
  name,
  value,
  onChange,
  onSelect,
  options,
  load,
  custom = false,
  required = false,
  placeholder,
  attribution,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (choice: Choice) => void;
  options?: Choice[];
  load?: (query: string, offset: number, signal: AbortSignal) => Promise<Page>;
  custom?: boolean;
  required?: boolean;
  placeholder?: string;
  attribution?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(-1);
  const [page, setPage] = useState<Page>({ options: [] });
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const local = options?.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()),
  );
  const choices = local ?? page.options;
  const customChoice =
    custom &&
    value.trim() &&
    !choices.some((o) => o.label.toLowerCase() === value.trim().toLowerCase())
      ? { id: "custom", label: value.trim() }
      : null;
  const available = customChoice ? [...choices, customChoice] : choices;
  useEffect(() => {
    if (!open || !load) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      void load(query, 0, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setPage(data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(
              e instanceof Error ? e.message : "Suggestions unavailable",
            );
            setPage({ options: [] });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, load]);
  function choose(choice: Choice) {
    setDraft(null);
    onChange(choice.label);
    onSelect?.(choice);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }
  async function more() {
    if (!load || page.nextOffset == null) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setLoading(true);
    try {
      const next = await load(query, page.nextOffset, controller.signal);
      setPage((old) => ({
        options: [...old.options, ...next.options],
        nextOffset: next.nextOffset,
      }));
    } catch {
      if (!controller.signal.aborted)
        setError("More suggestions could not be loaded.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <div
      className="combo"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
          setDraft(null);
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="combo-control">
        <input
          id={id}
          ref={input}
          name={name}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && active >= 0 ? `${id}-option-${active}` : undefined
          }
          aria-describedby={open ? `${id}-status` : undefined}
          autoComplete="off"
          required={required}
          maxLength={name === "niche" ? 150 : 100}
          value={options ? (draft ?? value) : value}
          placeholder={placeholder ?? "Search or browse"}
          onFocus={(e) => {
            setQuery("");
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            if (options) setDraft(e.target.value);
            onChange(e.target.value);
            setQuery(e.target.value);
            setPage({ options: [] });
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
              e.preventDefault();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                e.key === "ArrowDown"
                  ? Math.min(i + 1, available.length - 1)
                  : Math.max(i - 1, 0),
              );
            }
            if (e.key === "Enter" && open && active >= 0 && available[active]) {
              e.preventDefault();
              choose(available[active]);
            }
          }}
        />
        <button
          type="button"
          className="combo-toggle"
          aria-label={`Browse ${label.toLowerCase()}`}
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              input.current?.focus();
              setQuery("");
              setOpen(true);
            }
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      {open && (
        <div className="combo-popup">
          <div
            role="listbox"
            id={`${id}-list`}
            aria-label={`${label} suggestions`}
            className="combo-options"
          >
            {available.map((choice, i) => (
              <div
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={value === choice.label}
                key={`${choice.id}:${choice.label}`}
                className={`combo-option ${active === i ? "active" : ""}`}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(choice)}
                ref={(element) => {
                  if (active === i)
                    element?.scrollIntoView({ block: "nearest" });
                }}
              >
                <span>
                  {choice.id === "custom"
                    ? `Use “${choice.label}”`
                    : choice.label}
                </span>
                {value === choice.label && <Check size={15} />}
              </div>
            ))}
          </div>
          <div
            id={`${id}-status`}
            className="combo-status small"
            role="status"
            aria-live="polite"
          >
            {loading
              ? "Loading suggestions…"
              : error
                ? "Suggestions unavailable. Try again or enter a custom value."
                : !choices.length
                  ? custom
                    ? "No suggestions. Custom entries are welcome."
                    : "No matching options."
                  : `${choices.length} suggestions. Use the arrow keys to choose.`}
          </div>
          {page.nextOffset != null && !options && (
            <button
              className="button text"
              type="button"
              disabled={loading}
              onClick={more}
            >
              Load more cities
            </button>
          )}
          {attribution && <span className="combo-source">{attribution}</span>}
        </div>
      )}
    </div>
  );
}
