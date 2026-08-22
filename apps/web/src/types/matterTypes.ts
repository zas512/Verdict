import type { Matter } from "@/components/matters/MattersTable";

export interface MatterDetailProps {
  id: string;
  userRole: string | undefined;
  userId: string | undefined;
}

export interface CourtStage {
  id: string;
  name: string;
  caseType: string;
  sequenceOrder: number;
}

export interface Associate {
  id: string;
  name?: string | null;
  email: string;
}

export interface DetailedMatter extends Matter {
  parties: Array<{
    id: string;
    partyId: string;
    partyRole:
      | "PLAINTIFF"
      | "DEFENDANT"
      | "PETITIONER"
      | "RESPONDENT"
      | "ACCUSED"
      | "COMPLAINANT"
      | "OPPOSING_COUNSEL"
      | "CO_COUNSEL"
      | "WITNESS"
      | "COURT_CLERK";
    party?: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      isExternal: boolean;
    } | null;
  }>;
}

export interface MatterTabContentProps {
  tab: string;
  id: string;
  matter: DetailedMatter;
  userRole: string | undefined;
}

export interface MatterDetailActionsProps {
  isAdmin: boolean;
  isDownloading: boolean;
  onStageClick: () => void;
  onStatusClick: () => void;
  onAssignClick: () => void;
  onDownloadClick: () => void;
}

export type MatterTab =
  "overview" | "timeline" | "hearings" | "tasks" | "documents" | "parties";

export interface MatterTabButtonProps {
  tab: MatterTab;
  activeTab: MatterTab;
  onTabSelect: (tab: MatterTab) => void;
  icon: React.ReactNode;
  label: string;
  id: string;
}
