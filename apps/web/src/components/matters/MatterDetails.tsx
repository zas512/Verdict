import { MatterTabContentProps } from "@/types/matterTypes";
import { TasksBoard } from "../tasks/TasksBoard";
import { MatterDocuments } from "./MatterDocuments";
import { MatterHearings } from "./MatterHearings";
import { MatterOverview } from "./MatterOverview";
import { MatterParties } from "./MatterParties";
import { MatterTimeline } from "./MatterTimeline";

export function MatterTabContent({
  tab,
  id,
  matter,
  userRole
}: Readonly<MatterTabContentProps>) {
  switch (tab) {
    case "overview":
      return <MatterOverview matter={matter} />;
    case "timeline":
      return <MatterTimeline id={id} />;
    case "hearings":
      return <MatterHearings id={id} userRole={userRole} />;
    case "tasks":
      return <TasksBoard matterId={id} userRole={userRole} />;
    case "documents":
      return <MatterDocuments id={id} userRole={userRole} />;
    case "parties":
      return <MatterParties matter={matter} userRole={userRole} />;
    default:
      return null;
  }
}
