import { supabase } from "@/lib/supabase";

export type ProfileGearDefaults = {
  drag: number;
  rodLength: string;
  rodPower: string;
  rodAction: string;
  lineType: string;
  lineTest: string;
  bobberFloat: string;
  weight: string;
  leaderMaterial: string;
  leaderLength: string;
};

type ProfileGearRow = {
  tackle_drag: number | null;
  tackle_rod_length: string | null;
  tackle_rod_power: string | null;
  tackle_rod_action: string | null;
  tackle_line_type: string | null;
  tackle_line_test: string | null;
  tackle_bobber_float: string | null;
  tackle_weight: string | null;
  tackle_leader_material: string | null;
  tackle_leader_length: string | null;
};

const EMPTY_PROFILE_GEAR_DEFAULTS: ProfileGearDefaults = {
  drag: 0.5,
  rodLength: "",
  rodPower: "",
  rodAction: "",
  lineType: "",
  lineTest: "",
  bobberFloat: "",
  weight: "",
  leaderMaterial: "",
  leaderLength: "",
};

function mapProfileGearRow(row: ProfileGearRow | null): ProfileGearDefaults {
  if (!row) {
    return { ...EMPTY_PROFILE_GEAR_DEFAULTS };
  }

  return {
    drag:
      typeof row.tackle_drag === "number" && Number.isFinite(row.tackle_drag)
        ? Math.max(0, Math.min(1, row.tackle_drag))
        : 0.5,
    rodLength: row.tackle_rod_length ?? "",
    rodPower: row.tackle_rod_power ?? "",
    rodAction: row.tackle_rod_action ?? "",
    lineType: row.tackle_line_type ?? "",
    lineTest: row.tackle_line_test ?? "",
    bobberFloat: row.tackle_bobber_float ?? "",
    weight: row.tackle_weight ?? "",
    leaderMaterial: row.tackle_leader_material ?? "",
    leaderLength: row.tackle_leader_length ?? "",
  };
}

export async function getProfileGearDefaults(userId: string): Promise<ProfileGearDefaults> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "tackle_drag,tackle_rod_length,tackle_rod_power,tackle_rod_action,tackle_line_type,tackle_line_test,tackle_bobber_float,tackle_weight,tackle_leader_material,tackle_leader_length",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapProfileGearRow((data ?? null) as ProfileGearRow | null);
}

export async function saveProfileGearDefaults(
  userId: string,
  value: ProfileGearDefaults,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      tackle_drag: value.drag,
      tackle_rod_length: value.rodLength,
      tackle_rod_power: value.rodPower,
      tackle_rod_action: value.rodAction,
      tackle_line_type: value.lineType,
      tackle_line_test: value.lineTest,
      tackle_bobber_float: value.bobberFloat,
      tackle_weight: value.weight,
      tackle_leader_material: value.leaderMaterial,
      tackle_leader_length: value.leaderLength,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
