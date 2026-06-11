import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateRoundInput, Round, RoundQuestion } from "@/lib/types";

export async function createRound(
  supabase: SupabaseClient,
  data: CreateRoundInput
): Promise<Round> {
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      project_id: data.project_id,
      domain_name: data.domain_name,
      round_number: data.round_number,
      status: data.status ?? "pending",
      questions: data.questions,
      domains_affected: data.domains_affected ?? [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return round;
}

export async function getRoundById(
  supabase: SupabaseClient,
  id: string
): Promise<Round | null> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateRound(
  supabase: SupabaseClient,
  id: string,
  data: Partial<Pick<Round, "status" | "questions" | "domains_affected">>
): Promise<Round> {
  const { data: round, error } = await supabase
    .from("rounds")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return round;
}

export async function getRoundsForProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getRoundsForDomain(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string
): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("project_id", projectId)
    .eq("domain_name", domainName)
    .order("round_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPendingRoundForDomain(
  supabase: SupabaseClient,
  projectId: string,
  domainName: string
): Promise<Round | null> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("project_id", projectId)
    .eq("domain_name", domainName)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function mergeAnswersIntoQuestions(
  questions: RoundQuestion[],
  answers: { question_id: string; answer: string }[]
): RoundQuestion[] {
  return questions.map((question) => {
    const match = answers.find((item) => item.question_id === question.id);
    if (!match) {
      return question;
    }

    return { ...question, answer: match.answer };
  });
}
