export type AttendanceStatus = "IN_PRESENZA" | "ONLINE" | "ASSENTE_GIUSTIFICATO" | "GIUSTIFICATO" | "PRE_REGISTRATO" | "ASSENTE";

export interface StatusBadgeProps {
  status: AttendanceStatus;
}
