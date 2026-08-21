import { ReactNode } from "react";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  variant?: "info" | "success" | "warning" | "danger" | "default";
}
