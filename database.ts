import { createClient } from "@supabase/supabase-js";
import shortUUID from "short-uuid";

import { validate } from "uuid";
import { z } from "zod";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_KEY ?? ""
);

const translator = shortUUID();

/**
 * @returns isNewMember: boolean
 */
async function join(link: string, userid: number, username: string) {
  let { data, error } = await supabase.rpc("join_invite", {
    link: validate(link) ? link : null,
    userid,
    username,
  });
  if (error) {
    console.log("Error using join() function.");
    console.error(error);
    return false;
  } else {
    console.log(data);
    const { success, data: result } = z.boolean().safeParse(data);
    if (!success)
      console.log("Failed parsing join() result. Args: ", [
        link,
        userid,
        username,
      ]);
    return success ? result : false;
  }
}

/**
 * @returns inviteLink: string (short uuid)
 */
export async function getInviteLink(userid: number, username: string) {
  let { data, error } = await supabase.rpc("get_invite_link", {
    userid,
    username,
  });
  if (error) {
    throw error;
  } else {
    const { success, data: result, error } = z.string().safeParse(data);
    if (!success) {
      console.log("ZOD validation error at getInviteLink. Args: ", [userid]);
      throw error;
    }
    if (!validate(result))
      throw new Error("Invalid uuid returned from get_invite_link()");

    return translator.fromUUID(result);
  }
}

async function getLeaderboardLeaders() {
  let { data, error } = await supabase
    .from("user_invites")
    .select("*")
    .range(0, 9);

  const user_invites = z
    .object({
      username: z.string(),
      points: z.number(),
    })
    .array()
    .parse(data);

  return user_invites;
}

async function getNextGiveawayDate() {
  let { data, error } = await supabase
    .from("next_giveaway")
    .select("*")
    .eq("done", false)
    .limit(1)
    .single();

  const next_giveaway = z.object({ when: z.string() }).nullable().parse(data);
  return next_giveaway?.when ?? null;
}

const database = { join, getLeaderboardLeaders, getNextGiveawayDate };

export default database;
