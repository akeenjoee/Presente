import React from "react";
import { KpiCardProps } from "./KpiCard.types";

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  description,
  variant = "default",
}) => {
  const borderColors = {
    default: "border-gray-200 dark:border-gray-800",
    info: "border-blue-500",
    success: "border-green-500",
    warning: "border-yellow-500",
    danger: "border-red-500",
  };

  const bgColors = {
    default: "bg-white dark:bg-zinc-900",
    info: "bg-blue-50/50 dark:bg-blue-950/10",
    success: "bg-green-50/50 dark:bg-green-950/10",
    warning: "bg-yellow-50/50 dark:bg-yellow-950/10",
    danger: "bg-red-50/50 dark:bg-red-950/10",
  };

  return (
    <div className={`p-5 rounded-lg border-l-4 shadow-sm flex items-start justify-between ${borderColors[variant]} ${bgColors[variant]}`}>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{value}</h3>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {icon && (
        <div className="text-gray-400 dark:text-gray-500 mt-1">
          {icon}
        </div>
      )}
    </div>
  );
};
