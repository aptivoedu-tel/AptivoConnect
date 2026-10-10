"use client";

import React, { useState, useRef, useEffect } from "react";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "url" | "textarea" | "select" | "radio";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  options?: { label: string; value: string }[];
  maxLength?: number;
  minLength?: number;
  showCharCount?: boolean;
  helpText?: string;
  rows?: number;
}

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  options = [],
  maxLength,
  minLength,
  showCharCount = false,
  helpText,
  rows = 4,
}: FormFieldProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseInputClasses = `
    w-full px-4 py-3 rounded-xl border bg-white
    text-gray-900 placeholder-gray-400
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-600
    ${error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300"}
  `;

  const renderInput = () => {
    if (type === "textarea") {
      return (
        <div>
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            rows={rows}
            className={`${baseInputClasses} resize-none`}
            aria-describedby={error ? `${name}-error` : undefined}
            aria-invalid={!!error}
          />
          {showCharCount && (
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {minLength && value.length < minLength
                  ? `Minimum ${minLength} characters`
                  : ""}
              </span>
              <span
                className={`text-xs ${
                  maxLength && value.length > maxLength * 0.9
                    ? "text-amber-500"
                    : "text-gray-400"
                }`}
              >
                {value.length}
                {maxLength ? ` / ${maxLength}` : ""}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (type === "select") {
      const selectedOption = options.find((o) => o.value === value);
      return (
        <div className="relative" ref={dropdownRef}>
          {/* Trigger button */}
          <button
            type="button"
            id={name}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            className={`
              w-full px-4 py-3 rounded-xl border bg-white text-left
              flex items-center justify-between gap-2
              transition-all duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-teal-500/10
              ${error
                ? "border-red-300 bg-red-50/30"
                : dropdownOpen
                ? "border-teal-500 ring-2 ring-teal-500/10"
                : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <span className={`text-sm ${selectedOption ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {selectedOption ? selectedOption.label : (placeholder || "Select an option")}
            </span>
            {/* Chevron */}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Panel */}
          {dropdownOpen && (
            <div
              role="listbox"
              className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden animate-in"
              style={{ animation: "dropdownIn 0.15s ease-out" }}
            >
              <style>{`
                @keyframes dropdownIn {
                  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                  to   { opacity: 1; transform: translateY(0)      scale(1); }
                }
              `}</style>
              <div className="p-1.5 space-y-0.5">
                {options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setDropdownOpen(false);
                      }}
                      className={`
                        w-full text-left px-4 py-2.5 rounded-xl text-sm
                        flex items-center justify-between gap-2
                        transition-all duration-150 cursor-pointer
                        ${isSelected
                          ? "bg-teal-600 text-white font-semibold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === "radio") {
      return (
        <div className="space-y-2" role="radiogroup" aria-labelledby={`${name}-label`}>
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`
                flex items-center gap-3 p-3 rounded-xl border cursor-pointer
                transition-all duration-200
                ${
                  value === opt.value
                    ? "border-teal-600 bg-teal-50 ring-1 ring-teal-500/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <div
                className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  transition-all duration-200
                  ${value === opt.value ? "border-teal-600 bg-teal-600" : "border-gray-300"}
                `}
              >
                {value === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
                aria-describedby={error ? `${name}-error` : undefined}
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    return (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={baseInputClasses}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={!!error}
      />
    );
  };

  return (
    <div className="space-y-1.5">
      <label
        id={`${name}-label`}
        htmlFor={type !== "radio" && type !== "select" ? name : undefined}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {helpText && (
        <p className="text-xs text-gray-400 -mt-0.5">{helpText}</p>
      )}

      {renderInput()}

      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-500 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
