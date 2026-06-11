"use client";

import { useEffect, useState } from "react";

import { AnsweredRoundSummary } from "@/components/project/AnsweredRoundSummary";
import { QuestionRound } from "@/components/project/QuestionRound";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DOMAIN_DEFINITIONS } from "@/constants/domains";
import type { Domain, EvaluateAnswerInput, Round } from "@/lib/types";

interface DomainWorkspaceProps {
  projectId: string;
  domain: Domain;
  onRefresh: () => void;
}

function getDomainLabel(domain: Domain): string {
  const match = DOMAIN_DEFINITIONS.find((item) => item.name === domain.name);
  return match?.label ?? domain.name;
}

function getAnsweredRounds(rounds: Round[]): Round[] {
  return rounds.filter((round) => round.status === "answered");
}

function getPendingRound(rounds: Round[]): Round | null {
  return rounds.find((round) => round.status === "pending") ?? null;
}

export function DomainWorkspace({
  projectId,
  domain,
  onRefresh,
}: DomainWorkspaceProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domainLabel = getDomainLabel(domain);
  const answeredRounds = getAnsweredRounds(rounds);
  const showStopHere =
    domain.status === "in_progress" || domain.status === "complete";

  async function loadRounds() {
    const params = new URLSearchParams({
      project_id: projectId,
      domain_name: domain.name,
    });

    const response = await fetch(`/api/rounds?${params.toString()}`);
    const data = (await response.json()) as {
      rounds?: Round[];
      error?: string;
    };

    if (!response.ok) {
      setError(data.error ?? "Failed to load rounds");
      return;
    }

    const loadedRounds = data.rounds ?? [];
    setRounds(loadedRounds);
    setActiveRound(getPendingRound(loadedRounds));
  }

  useEffect(() => {
    if (domain.status === "available") {
      setRounds([]);
      setActiveRound(null);
      return;
    }

    void loadRounds();
  }, [domain.id, domain.status, projectId]);

  async function handleStart() {
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/rounds/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          domain_name: domain.name,
        }),
      });

      const data = (await response.json()) as {
        round?: Round;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to generate questions");
        return;
      }

      if (data.round) {
        setActiveRound(data.round);
        await loadRounds();
        onRefresh();
      }
    } catch {
      setError("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmitAnswers(answers: EvaluateAnswerInput[]) {
    if (!activeRound) {
      return;
    }

    setError(null);
    setIsEvaluating(true);

    try {
      const response = await fetch("/api/rounds/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          domain_name: domain.name,
          round_id: activeRound.id,
          answers,
        }),
      });

      const data = (await response.json()) as {
        action?: "follow_up" | "advance";
        round?: Round | null;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to evaluate answers");
        return;
      }

      if (data.action === "follow_up" && data.round) {
        setActiveRound(data.round);
      } else {
        setActiveRound(null);
      }

      await loadRounds();
      onRefresh();
    } catch {
      setError("Failed to evaluate answers");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleStopHereChange(checked: boolean) {
    setError(null);
    setIsUpdatingStatus(true);

    const status = checked ? "complete" : "in_progress";

    try {
      const response = await fetch(`/api/domains/${domain.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Failed to update domain status");
        return;
      }

      onRefresh();
    } catch {
      setError("Failed to update domain status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function renderAvailableState() {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-[#6B7280]">
          Start the questionnaire to capture decisions and constraints for this
          domain.
        </p>
        <Button disabled={isGenerating} onClick={handleStart} type="button">
          {isGenerating ? "Generating..." : `Start ${domainLabel}`}
        </Button>
      </div>
    );
  }

  function renderInProgressState() {
    return (
      <div className="space-y-6">
        {answeredRounds.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#111827]">
              Previous rounds
            </h3>
            {answeredRounds.map((round) => (
              <AnsweredRoundSummary key={round.id} round={round} />
            ))}
          </div>
        ) : null}

        {activeRound ? (
          <QuestionRound
            isLoading={isEvaluating}
            onSubmit={handleSubmitAnswers}
            round={activeRound}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              No pending questions. Generate the next round or mark this domain
              complete.
            </p>
            <Button disabled={isGenerating} onClick={handleStart} type="button">
              {isGenerating ? "Generating..." : `Continue ${domainLabel}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderCompleteState() {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#111827]">Completed rounds</h3>
        {answeredRounds.length > 0 ? (
          answeredRounds.map((round) => (
            <AnsweredRoundSummary key={round.id} round={round} />
          ))
        ) : (
          <p className="text-sm text-[#6B7280]">No answered rounds yet.</p>
        )}
      </div>
    );
  }

  function renderContent() {
    if (domain.status === "available") {
      return renderAvailableState();
    }

    if (domain.status === "complete") {
      return renderCompleteState();
    }

    return renderInProgressState();
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {renderContent()}

      {showStopHere ? (
        <div className="flex items-center gap-3 border-t border-[#E5E7EB] pt-6">
          <Switch
            checked={domain.status === "complete"}
            disabled={isUpdatingStatus}
            id={`stop-here-${domain.id}`}
            onCheckedChange={handleStopHereChange}
          />
          <Label htmlFor={`stop-here-${domain.id}`}>Stop Here</Label>
        </div>
      ) : null}
    </div>
  );
}
