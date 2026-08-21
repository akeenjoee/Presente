export interface RosterMember {
  socio_id: number;
  nome: string;
  email: string;
  ruolo: string;
  area_lavoro: string;
  stato: string;
  tipo_evento?: string;
  consecutive_absences: number;
  is_critical_alert: boolean;
  attendance_status?: "IN_PRESENZA" | "ONLINE" | "ASSENTE_GIUSTIFICATO" | "GIUSTIFICATO" | "PRE_REGISTRATO" | "ASSENTE";
  attendance_modality?: string;
  delega_a?: string;
  is_preregistrato?: boolean;
}

export interface LiveRosterTableProps {
  members: RosterMember[];
  onManualCheckin?: (socioId: number, status: "IN_PRESENZA" | "ONLINE" | "GIUSTIFICATO" | "PRE_REGISTRATO" | "ASSENTE", delega_a?: string) => Promise<void>;
  isLoading?: boolean;
}
