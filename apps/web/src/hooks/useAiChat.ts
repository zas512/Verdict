import { isAiEnabled } from "@/config/ai";
import {
  addMessage,
  clearMessages,
  closeAiChat,
  openAiChat,
  setActiveCategory,
  setDraftInput,
  setMessageFeedback,
  setThinking,
  toggleAiChat
} from "@/redux/aiChat";
import { AppDispatch, RootState } from "@/redux/store";
import { AiAttachment, AiMessage, LegalCitation } from "@/types/ai-chat";
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

function generateMockAiResponse(userPrompt: string): {
  content: string;
  citations?: LegalCitation[];
} {
  const promptLower = userPrompt.toLowerCase();
  if (
    promptLower.includes("hearing") ||
    promptLower.includes("court") ||
    promptLower.includes("deadline")
  ) {
    return {
      content: `### ⚖️ Scheduled Court Hearings & Deadlines (This Week)

Based on your active firm docket, here are the upcoming court appearances:

1. **Matter #104: *Apex Holdings vs. Sindh Revenue Board***
   - **Court:** High Court of Sindh (Courtroom 3, DB-II)
   - **Hearing Date:** Thursday, 10:30 AM
   - **Lead Counsel:** Senior Partner
   - **Status:** Rejoinder filed; arguments on interim stay application.

2. **Matter #118: *Zubair Textile Mills Arbitration***
   - **Forum:** Karachi Centre for Dispute Resolution (KCDR)
   - **Deadline:** Friday, 4:00 PM (Submission of Statement of Defense)
   - **Assigned Associate:** Syed Hamza

> [!TIP]
> All statutory limitation dates for this quarter are in compliance. Would you like me to draft a quick brief for the Apex Holdings hearing?`,
      citations: [
        {
          title: "PLD 2021 SC 582",
          source: "Supreme Court of Pakistan",
          year: "2021",
          summary:
            "Principles governing grant of interim injunctive relief against statutory recovery."
        }
      ]
    };
  }

  if (
    promptLower.includes("notice") ||
    promptLower.includes("draft") ||
    promptLower.includes("contract")
  ) {
    return {
      content: `### 📄 Draft Legal Notice: Breach of Commercial Contract

**TO:** [Counterparty Name / Registered Address]  
**FROM:** Verdict Legal Advocates on behalf of [Client Name]  
**DATE:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}  
**SUBJECT:** Legal Notice under Section 73 & 74 of the Contract Act, 1872 for Breach of Master Services Agreement

---

**TAKE NOTICE** that under instructions from and on behalf of our client, **[Client Company Name]**, we state as follows:

1. That an agreement dated [Date] was duly executed between our client and your company for the provision of enterprise logistics services.
2. That pursuant to Clause 8.2 of the said Agreement, invoices amounting to **PKR 3,450,000/-** fell due on [Due Date], yet remain unpaid despite formal reminders.
3. You are hereby called upon to cure the aforesaid default and remit the outstanding sum within **15 (fifteen) days** from the receipt of this Notice, failing which our client will institute civil recovery and arbitration proceedings at your sole cost and consequence.

*(A formal PDF draft with your firm letterhead can be exported upon confirmation).*`,
      citations: [
        {
          title: "Contract Act, 1872",
          source: "Sections 73 & 74 (Damages for breach)",
          year: "1872"
        }
      ]
    };
  }

  if (
    promptLower.includes("precedent") ||
    promptLower.includes("research") ||
    promptLower.includes("citation")
  ) {
    return {
      content: `### 📚 Legal Precedents & Authorities

Here are the leading precedents regarding specific performance of commercial contracts:

- **PLD 2019 SC 312 — *Muhammad Ramzan v. Trustees of KPT***  
  *Ratio:* Specific performance is a discretionary relief; prompt readiness and willingness must be demonstrated throughout the proceeding.
  
- **2022 CLD 844 (Lahore) — *Al-Falah Commercial Ventures***  
  *Ratio:* Liquidated damages clause does not automatically bar a suit for specific performance if the property is unique.

- **2020 SCMR 1978 — *National Logistics Cell v. Consortium Enterprises***  
  *Ratio:* Scope of arbitrator discretion in awarding pre-award interest under the Arbitration Act, 1940.`,
      citations: [
        {
          title: "PLD 2019 SC 312",
          source: "Supreme Court of Pakistan",
          year: "2019"
        },
        {
          title: "2022 CLD 844",
          source: "Lahore High Court",
          year: "2022"
        }
      ]
    };
  }

  if (
    promptLower.includes("workload") ||
    promptLower.includes("attendance") ||
    promptLower.includes("billing") ||
    promptLower.includes("expense")
  ) {
    return {
      content: `### 📊 Firm Operations & Workload Summary

- **Active Associates:** 8 on duty | 1 on approved leave
- **Pending Tasks:** 14 active tasks (3 high priority due within 48 hours)
- **Unbilled Disbursements:** PKR 284,500 pending client invoicing
- **Matter Distribution:** 62% Corporate & Commercial, 28% Civil Litigation, 10% Advisory

All associates have logged attendance today. Let me know if you would like me to generate a formal expense report summary for Partner review.`,
      citations: []
    };
  }

  // Default intelligent assistant response
  return {
    content: `I have processed your query: **"${userPrompt}"**.

As your legal and firm management co-pilot, I can assist you with:
- Analyzing firm matters, court diaries, and upcoming hearings
- Drafting legal notices, petitions, client advisory memos, and engagement letters
- Searching relevant case law and statutory citations (PLD, SCMR, CLD, MLD)
- Summarizing associate tasks, time logs, and billing disbursements

Feel free to attach a case document or select one of the quick prompt workflows below!`
  };
}

export function useAiChat() {
  const dispatch = useDispatch<AppDispatch>();
  const enabled = isAiEnabled();
  const isOpen = useSelector((state: RootState) => state.aiChat.isOpen);
  const isThinking = useSelector((state: RootState) => state.aiChat.isThinking);
  const messages = useSelector((state: RootState) => state.aiChat.messages);
  const draftInput = useSelector((state: RootState) => state.aiChat.draftInput);
  const activeCategory = useSelector(
    (state: RootState) => state.aiChat.activeCategory
  );

  // Global keyboard shortcut: Ctrl+J / Cmd+J to toggle AI Chat
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle on Ctrl+J or Cmd+J
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "j" || event.key === "J")
      ) {
        event.preventDefault();
        dispatch(toggleAiChat());
      }
      // Close on Escape if open
      if (event.key === "Escape" && isOpen) {
        dispatch(closeAiChat());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, isOpen, dispatch]);

  const send = useCallback(
    async (content: string, attachments?: AiAttachment[]) => {
      const trimmed = content.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;

      const userMsg: AiMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        status: "sent",
        attachments
      };

      // Add user message & clear draft
      dispatch(addMessage(userMsg));
      dispatch(setDraftInput(""));
      dispatch(setThinking(true));

      // Simulate realistic AI generation latency
      setTimeout(() => {
        const mockReply = generateMockAiResponse(trimmed);
        const aiMsg: AiMessage = {
          id: `msg-ai-${Date.now()}`,
          role: "assistant",
          content: mockReply.content,
          timestamp: new Date().toISOString(),
          status: "sent",
          citations: mockReply.citations
        };

        dispatch(addMessage(aiMsg));
        dispatch(setThinking(false));
      }, 1100);
    },
    [dispatch]
  );

  const clear = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  const handleFeedback = useCallback(
    (messageId: string, feedback: "liked" | "disliked" | null) => {
      dispatch(setMessageFeedback({ id: messageId, feedback }));
    },
    [dispatch]
  );

  return {
    enabled,
    isOpen,
    isThinking,
    messages,
    draftInput,
    activeCategory,
    open: () => dispatch(openAiChat()),
    close: () => dispatch(closeAiChat()),
    toggle: () => dispatch(toggleAiChat()),
    setDraft: (text: string) => dispatch(setDraftInput(text)),
    setCategory: (cat: string | null) => dispatch(setActiveCategory(cat)),
    sendMessage: send,
    clearChat: clear,
    setFeedback: handleFeedback
  };
}
