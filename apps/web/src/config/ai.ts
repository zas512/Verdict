export interface QuickPrompt {
  id: string;
  category: "matters" | "drafting" | "research" | "operations";
  categoryLabel: string;
  title: string;
  description: string;
  prompt: string;
  iconName: string;
}

export const AI_CONFIG = {
  name: "Verdict AI",
  subtitle: "Legal Intelligence & Operations Assistant",
  modelName: "Gemini 2.5 Pro Legal",
  badge: "Enterprise AI",
  description:
    "Instant firm intelligence, matter summaries, precedent citations, drafting support, and operations insights.",
  disclaimer:
    "Verdict AI can make mistakes. Please verify case citations and legal analysis with official court records."
} as const;

export function isAiEnabled(): boolean {
  const publicFlag = process.env.NEXT_PUBLIC_AI_FLAG;
  const serverFlag = process.env.AI_FLAG;
  if (publicFlag !== undefined) {
    return (
      publicFlag.toLowerCase() === "true" ||
      publicFlag === "1" ||
      publicFlag.toLowerCase() === "yes"
    );
  }
  if (serverFlag !== undefined) {
    return (
      serverFlag.toLowerCase() === "true" ||
      serverFlag === "1" ||
      serverFlag.toLowerCase() === "yes"
    );
  }
  return true;
}

export const AI_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: "matters-hearings",
    category: "matters",
    categoryLabel: "Matters & Hearings",
    title: "Upcoming Hearings & Deadlines",
    description:
      "Scan active cases for this week's scheduled court appearances",
    prompt:
      "Please summarize all upcoming court hearings, judge assignments, and critical filing deadlines for our active matters this week.",
    iconName: "Scale"
  },
  {
    id: "draft-legal-notice",
    category: "drafting",
    categoryLabel: "Drafting",
    title: "Draft Legal Notice",
    description: "Generate standard formal notice for contractual breach",
    prompt:
      "Draft a formal Legal Notice on behalf of our client regarding a breach of commercial service agreement with a 15-day cure period.",
    iconName: "FileText"
  },
  {
    id: "precedent-research",
    category: "research",
    categoryLabel: "Legal Research",
    title: "Civil Precedent Search",
    description: "Find relevant High Court & Supreme Court authorities",
    prompt:
      "Identify key High Court and Supreme Court of Pakistan precedents concerning specific performance of commercial property contracts.",
    iconName: "BookOpen"
  },
  {
    id: "firm-operations",
    category: "operations",
    categoryLabel: "Firm Operations",
    title: "Billing & Workload Overview",
    description: "Analyze team utilization and pending unbilled disbursements",
    prompt:
      "Provide a quick summary of firm-wide associate workload, pending tasks due this week, and unbilled expense disbursements.",
    iconName: "BarChart3"
  }
];
