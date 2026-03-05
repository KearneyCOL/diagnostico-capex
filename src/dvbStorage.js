import { supabase } from "./supabaseClient";

export function getIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("id");
}

export function setIdInUrl(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", id);
  window.history.replaceState({}, "", url.toString());
}

export async function loadAssessment(id) {
  const { data, error } = await supabase
    .from("dvb_assessments")
    .select("data")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data?.data ?? null;
}

export async function saveAssessment(id, payload) {
  const { error } = await supabase
    .from("dvb_assessments")
    .upsert({ id, data: payload }, { onConflict: "id" });
  if (error) throw error;
}