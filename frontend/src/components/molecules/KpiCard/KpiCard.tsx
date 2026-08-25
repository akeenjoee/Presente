import React from "react";
import { KpiCardProps } from "./KpiCard.types";

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  description,
  variant = "default",
}) => {
  const iconContainerStyles = {
    default: "bg-[#2b397c]/10 dark:bg-[#2b397c]/30",
    info: "bg-[#2b397c]/10 dark:bg-[#2b397c]/30",
    success: "bg-green-50 dark:bg-green-900/20",
    warning: "bg-yellow-50 dark:bg-yellow-900/20",
    danger: "bg-red-50 dark:bg-red-900/20",
  };

  const iconColors = {
    default: "text-[#2b397c] dark:text-blue-400",
    info: "text-[#2b397c] dark:text-blue-400",
    success: "text-green-600 dark:text-green-500",
    warning: "text-yellow-600 dark:text-yellow-500",
    danger: "text-red-600 dark:text-red-500",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-2xl flex items-center gap-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full relative overflow-hidden group">
      {/* Optional: subtle background glow on hover based on variant */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none ${iconContainerStyles[variant]}`} />
      
      {icon && (
        <div className={`p-4 shrink-0 rounded-2xl ${iconContainerStyles[variant]} shadow-inner`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: `h-8 w-8 ${iconColors[variant]}` })}
        </div>
      )}
      <div className="flex-1 min-w-0 z-10">
        <p className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate" title={title}>
          {title}
        </p>
        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 leading-none tracking-tight">
          {value}
        </p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-tight truncate" title={description}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
