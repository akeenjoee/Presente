import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  forceLight?: boolean;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, forceLight = false, className = "", ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className={`text-xs font-bold uppercase tracking-wide ${forceLight ? "text-[#1f295c]" : "text-[#1f295c] dark:text-gray-300"}`}>
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          forceLight 
            ? "bg-white border border-gray-200 text-gray-900" 
            : "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white"
        } ${
          error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      >
        <option value="" disabled hidden>Seleziona un'opzione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs font-medium text-red-500 mt-0.5">{error}</span>}
    </div>
  );
};
