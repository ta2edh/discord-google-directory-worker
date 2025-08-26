import {
  getUserByEmail,
  getGroupMembers,
  createGroup,
  updateGroup,
  getGroup,
  listGroups,
  listGroupsForMember,
  deleteGroup,
  addGroupMember,
  updateGroupMember,
  listAllGroupMembers,
  removeGroupMember,
  addGroupAlias,
  listGroupAliases,
  deleteGroupAlias,
  createOrgUnit,
  updateOrgUnit,
  getOrgUnit,
  listOrgUnits,
  deleteOrgUnit,
  listRoles,
  listRoleAssignments,
  createRoleAssignment,
  createUser,
  updateUser,
  makeUserAdmin,
  listUsers,
  deleteUser,
  undeleteUser,
  createUserAlias,
  listUserAliases,
  deleteUserAlias,
} from "./google_directory";
import type { Env } from "../worker";

type Interaction = {
  type: number;
  id: string;
  token: string;
  data?: {
    name?: string;
    options?: Array<{ name: string; type: number; value?: string; options?: any[] }>;
  };
};

const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

function extractRawJsonFromError(error: unknown): string | null {
  const msg = typeof error === "object" && error && "message" in error ? String((error as any).message) : String(error);
  const idx = msg.indexOf("{");
  if (idx >= 0) {
    const candidate = msg.slice(idx).trim();
    try {
      const obj = JSON.parse(candidate);
      return JSON.stringify(obj, null, 2);
    } catch {
      // not json
    }
  }
  return null;
}

async function sendError(env: Env, token: string, error: unknown) {
  const raw = extractRawJsonFromError(error);
  if (raw) {
    await followup(env, token, "```json\n" + raw + "\n```");
  } else {
    const text = typeof error === "object" && error && "message" in error ? String((error as any).message) : String(error);
    await followup(env, token, "```\n" + text + "\n```");
  }
}

export async function handleInteraction(body: Interaction, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (body.type === InteractionType.PING) {
    return json({ type: 1 });
  }

  if (body.type === InteractionType.APPLICATION_COMMAND) {
    const name = body.data?.name;
    const opts = body.data?.options ?? [];
    const option = (key: string) => opts.find(o => o.name === key)?.value as string | undefined;

    if (name === "user") {
      const email = option("email");
      if (!email) return respondEphemeral("Kullanıcı e-postası gerekli: /user email:someone@example.com");
      ctx.waitUntil((async () => {
        try {
          const user = await getUserByEmail(env, email);
          const lines = [
            `Ad: ${user.name?.fullName ?? "-"}`,
            `Primary Email: ${user.primaryEmail ?? email}`,
            `Org Unit: ${user.orgUnitPath ?? "-"}`,
            `Suspended: ${user.suspended ? "Evet" : "Hayır"}`,
          ];
          await followup(env, body.token, lines.join("\n"));
        } catch (e: any) {
          await sendError(env, body.token, e);
        }
      })());
      return respondDeferred();
    }

    if (name === "group") {
      const groupEmail = option("email");
      if (!groupEmail) return respondEphemeral("Grup e-postası gerekli: /group email:group@example.com");
      ctx.waitUntil((async () => {
        try {
          const members = await getGroupMembers(env, groupEmail);
          const top = members.slice(0, 25).map(m => `- ${m.email} (${m.role})`).join("\n");
          const more = members.length > 25 ? `\n... toplam ${members.length} üye` : "";
          await followup(env, body.token, `Üyeler:\n${top}${more}`);
        } catch (e: any) {
          await sendError(env, body.token, e);
        }
      })());
      return respondDeferred();
    }

    if (name === "admin") {
      const root = opts[0];
      if (!root) return respondEphemeral("Alt komut gerekli");
      const sub = root.options?.[0];
      const params = sub?.options ?? [];
      const get = (k: string) => params.find(p => p.name === k)?.value as string | undefined;

      ctx.waitUntil((async () => {
        try {
          switch (root.name) {
            case "groups": {
              switch (sub?.name) {
                case "create": {
                  const email = get("email");
                  const name = get("name");
                  const description = get("description");
                  if (!email) throw new Error("email gerekli");
                  const r = await createGroup(env, { email, name, description });
                  await followup(env, body.token, `Grup oluşturuldu: ${r.email}`);
                  break;
                }
                case "update": {
                  const group = get("group");
                  const name = get("name");
                  const description = get("description");
                  if (!group) throw new Error("group gerekli");
                  const r = await updateGroup(env, group, { name, description });
                  await followup(env, body.token, `Grup güncellendi: ${r.email || group}`);
                  break;
                }
                case "get": {
                  const group = get("group");
                  if (!group) throw new Error("group gerekli");
                  const r = await getGroup(env, group);
                  await followup(env, body.token, `Grup: ${r.email} (${r.name || "-"})`);
                  break;
                }
                case "list": {
                  const domain = get("domain");
                  const customer = get("customer");
                  const r = await listGroups(env, { domain, customer });
                  const top = r.slice(0, 25).map((g: any) => `- ${g.email}`).join("\n");
                  const more = r.length > 25 ? `\n... toplam ${r.length} grup` : "";
                  await followup(env, body.token, `Gruplar:\n${top}${more}`);
                  break;
                }
                case "list-for-user": {
                  const user = get("user");
                  if (!user) throw new Error("user gerekli");
                  const r = await listGroupsForMember(env, user);
                  const lines = r.map((g: any) => `- ${g.email}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "delete": {
                  const group = get("group");
                  if (!group) throw new Error("group gerekli");
                  await deleteGroup(env, group);
                  await followup(env, body.token, `Grup silindi: ${group}`);
                  break;
                }
              }
              break;
            }
            case "members": {
              switch (sub?.name) {
                case "add": {
                  const group = get("group");
                  const email = get("email");
                  const role = (get("role") as any) || "MEMBER";
                  if (!group || !email) throw new Error("group ve email gerekli");
                  await addGroupMember(env, group, { email, role });
                  await followup(env, body.token, `Üye eklendi: ${email}`);
                  break;
                }
                case "update": {
                  const group = get("group");
                  const member = get("member");
                  const role = (get("role") as any) || "MEMBER";
                  if (!group || !member) throw new Error("group ve member gerekli");
                  await updateGroupMember(env, group, member, { role });
                  await followup(env, body.token, `Üyelik güncellendi: ${member}`);
                  break;
                }
                case "list": {
                  const group = get("group");
                  if (!group) throw new Error("group gerekli");
                  const r = await listAllGroupMembers(env, group);
                  const top = r.slice(0, 25).map((m: any) => `- ${m.email} (${m.role})`).join("\n");
                  const more = r.length > 25 ? `\n... toplam ${r.length} üye` : "";
                  await followup(env, body.token, `Üyeler:\n${top}${more}`);
                  break;
                }
                case "remove": {
                  const group = get("group");
                  const member = get("member");
                  if (!group || !member) throw new Error("group ve member gerekli");
                  await removeGroupMember(env, group, member);
                  await followup(env, body.token, `Üyelik silindi: ${member}`);
                  break;
                }
              }
              break;
            }
            case "aliases": {
              switch (sub?.name) {
                case "add": {
                  const group = get("group");
                  const alias = get("alias");
                  if (!group || !alias) throw new Error("group ve alias gerekli");
                  await addGroupAlias(env, group, alias);
                  await followup(env, body.token, `Takma ad eklendi: ${alias}`);
                  break;
                }
                case "list": {
                  const group = get("group");
                  if (!group) throw new Error("group gerekli");
                  const r = await listGroupAliases(env, group);
                  const lines = r.map((a: any) => `- ${a.alias || a}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "delete": {
                  const group = get("group");
                  const alias = get("alias");
                  if (!group || !alias) throw new Error("group ve alias gerekli");
                  await deleteGroupAlias(env, group, alias);
                  await followup(env, body.token, `Takma ad silindi: ${alias}`);
                  break;
                }
              }
              break;
            }
            case "orgunits": {
              switch (sub?.name) {
                case "create": {
                  const name = get("name");
                  const parent = get("parent");
                  const description = get("description");
                  if (!name) throw new Error("name gerekli");
                  const r = await createOrgUnit(env, { name, parentOrgUnitPath: parent, description });
                  await followup(env, body.token, `OU oluşturuldu: ${r.orgUnitPath}`);
                  break;
                }
                case "update": {
                  const path = get("path");
                  if (!path) throw new Error("path gerekli");
                  const name = get("name");
                  const description = get("description");
                  const parent = get("parent");
                  const r = await updateOrgUnit(env, path, { name, description, parentOrgUnitPath: parent });
                  await followup(env, body.token, `OU güncellendi: ${r.orgUnitPath}`);
                  break;
                }
                case "get": {
                  const path = get("path");
                  if (!path) throw new Error("path gerekli");
                  const r = await getOrgUnit(env, path);
                  await followup(env, body.token, `OU: ${r.name} (${r.orgUnitPath})`);
                  break;
                }
                case "list": {
                  const r = await listOrgUnits(env);
                  const lines = r.map((ou: any) => `- ${ou.orgUnitPath}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "delete": {
                  const path = get("path");
                  if (!path) throw new Error("path gerekli");
                  await deleteOrgUnit(env, path);
                  await followup(env, body.token, `OU silindi: ${path}`);
                  break;
                }
              }
              break;
            }
            case "roles": {
              switch (sub?.name) {
                case "list": {
                  const r = await listRoles(env);
                  const lines = r.slice(0, 25).map((i: any) => `- ${i.roleId}: ${i.roleName}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "assignments": {
                  const user = get("user");
                  const r = await listRoleAssignments(env, user);
                  const lines = r.map((a: any) => `- role ${a.roleId} -> ${a.assignedTo}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "assign": {
                  const roleId = get("role_id");
                  const assignedTo = get("assigned_to");
                  const scopeType = get("scope_type") as any;
                  const orgUnitId = get("org_unit_id");
                  if (!roleId || !assignedTo) throw new Error("roleId ve assignedTo gerekli");
                  const r = await createRoleAssignment(env, { roleId, assignedTo, scopeType, orgUnitId });
                  await followup(env, body.token, `Rol atandı: ${r.roleAssignmentId}`);
                  break;
                }
              }
              break;
            }
            case "users": {
              switch (sub?.name) {
                case "create": {
                  const primaryEmail = get("email");
                  const givenName = get("given_name");
                  const familyName = get("family_name");
                  const password = get("password");
                  if (!primaryEmail || !givenName || !familyName || !password) throw new Error("email, givenName, familyName, password gerekli");
                  const r = await createUser(env, { primaryEmail, name: { givenName, familyName }, password });
                  await followup(env, body.token, `Kullanıcı oluşturuldu: ${r.primaryEmail}`);
                  break;
                }
                case "update": {
                  const user = get("user");
                  const orgUnitPath = get("org_unit_path");
                  if (!user) throw new Error("user gerekli");
                  const r = await updateUser(env, user, { orgUnitPath });
                  await followup(env, body.token, `Kullanıcı güncellendi: ${r.primaryEmail || user}`);
                  break;
                }
                case "make-admin": {
                  const user = get("user");
                  const status = get("status");
                  if (!user || typeof status === "undefined") throw new Error("user ve status gerekli");
                  await makeUserAdmin(env, user, status === "true");
                  await followup(env, body.token, `Admin durumu güncellendi: ${user}`);
                  break;
                }
                case "get": {
                  const user = get("user");
                  if (!user) throw new Error("user gerekli");
                  const r = await getUserByEmail(env, user);
                  await followup(env, body.token, `Kullanıcı: ${r.primaryEmail}`);
                  break;
                }
                case "list": {
                  const domain = get("domain");
                  const customer = get("customer");
                  const r = await listUsers(env, { domain, customer });
                  const lines = r.slice(0, 25).map((u: any) => `- ${u.primaryEmail}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "delete": {
                  const user = get("user");
                  if (!user) throw new Error("user gerekli");
                  await deleteUser(env, user);
                  await followup(env, body.token, `Kullanıcı silindi: ${user}`);
                  break;
                }
                case "undelete": {
                  const user = get("user");
                  if (!user) throw new Error("user gerekli");
                  await undeleteUser(env, user);
                  await followup(env, body.token, `Kullanıcı geri alındı: ${user}`);
                  break;
                }
              }
              break;
            }
            case "user-aliases": {
              switch (sub?.name) {
                case "create": {
                  const user = get("user");
                  const alias = get("alias");
                  if (!user || !alias) throw new Error("user ve alias gerekli");
                  await createUserAlias(env, user, alias);
                  await followup(env, body.token, `Takma ad eklendi: ${alias}`);
                  break;
                }
                case "list": {
                  const user = get("user");
                  if (!user) throw new Error("user gerekli");
                  const r = await listUserAliases(env, user);
                  const lines = r.map((a: any) => `- ${a.alias || a}`).join("\n");
                  await followup(env, body.token, lines || "(yok)");
                  break;
                }
                case "delete": {
                  const user = get("user");
                  const alias = get("alias");
                  if (!user || !alias) throw new Error("user ve alias gerekli");
                  await deleteUserAlias(env, user, alias);
                  await followup(env, body.token, `Takma ad silindi: ${alias}`);
                  break;
                }
              }
              break;
            }
            default:
              await followup(env, body.token, "Bilinmeyen alt komut grubu");
          }
        } catch (e: any) {
          await sendError(env, body.token, e);
        }
      })());
      return respondDeferred();
    }

    return respondEphemeral("Bilinmeyen komut");
  }

  return new Response("", { status: 400 });
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, ...init });
}

function respondEphemeral(content: string) {
  return json({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content, flags: 64 }, // EPHEMERAL
  });
}

function respondDeferred() {
  return json({ type: 5 }); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
}

export async function followup(env: Env, token: string, content: string) {
  await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${token}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
}



