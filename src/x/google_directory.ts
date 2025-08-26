import type { Env } from "../worker";

type GoogleUser = {
  primaryEmail?: string;
  name?: { fullName?: string };
  orgUnitPath?: string;
  suspended?: boolean;
};

type GoogleGroupMember = { email: string; role: string };

export async function getUserByEmail(env: Env, email: string): Promise<GoogleUser> {
  const accessToken = await getAccessToken(env, [
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
  ]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} ${text}`);
  }
  return await res.json<GoogleUser>();
}

export async function getGroupMembers(env: Env, groupEmail: string): Promise<GoogleGroupMember[]> {
  const accessToken = await getAccessToken(env, [
    "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
  ]);
  const base = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`;
  let url = base;
  const members: GoogleGroupMember[] = [];
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google API ${res.status} ${text}`);
    }
    const data = await res.json<any>();
    for (const m of data.members ?? []) {
      members.push({ email: m.email, role: m.role });
    }
    if (!data.nextPageToken) break;
    url = `${base}?pageToken=${encodeURIComponent(data.nextPageToken)}`;
  }
  return members;
}

// ========== Groups ==========
export async function createGroup(env: Env, body: { email: string; name?: string; description?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} ${text}`);
  }
  return res.json<any>();
}

export async function updateGroup(env: Env, groupKey: string, body: { name?: string; description?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} ${text}`);
  }
  return res.json<any>();
}

export async function getGroup(env: Env, groupKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.readonly"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function listGroups(env: Env, domainOrCustomer?: { domain?: string; customer?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.readonly"]);
  const params = new URLSearchParams();
  if (domainOrCustomer?.domain) params.set("domain", domainOrCustomer.domain);
  if (domainOrCustomer?.customer) params.set("customer", domainOrCustomer.customer);
  const base = `https://admin.googleapis.com/admin/directory/v1/groups?${params.toString()}`;
  let url = base;
  const groups: any[] = [];
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const data = await res.json<any>();
    groups.push(...(data.groups ?? []));
    if (!data.nextPageToken) break;
    const p = new URLSearchParams(params);
    p.set("pageToken", data.nextPageToken);
    url = `https://admin.googleapis.com/admin/directory/v1/groups?${p.toString()}`;
  }
  return groups;
}

export async function listGroupsForMember(env: Env, userEmail: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.readonly"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups?userKey=${encodeURIComponent(userEmail)}` ,{
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.groups ?? [];
}

export async function deleteGroup(env: Env, groupKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

// ========== Group Members ==========
export async function addGroupMember(env: Env, groupKey: string, member: { email: string; role?: "MEMBER" | "MANAGER" | "OWNER" }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.member"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/members`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ email: member.email, role: member.role ?? "MEMBER" }),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function updateGroupMember(env: Env, groupKey: string, memberKey: string, body: { role?: "MEMBER" | "MANAGER" | "OWNER" }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.member"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function listAllGroupMembers(env: Env, groupKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.member.readonly"]);
  const base = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/members`;
  let url = base;
  const members: any[] = [];
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const data = await res.json<any>();
    members.push(...(data.members ?? []));
    if (!data.nextPageToken) break;
    url = `${base}?pageToken=${encodeURIComponent(data.nextPageToken)}`;
  }
  return members;
}

export async function removeGroupMember(env: Env, groupKey: string, memberKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.member"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/members/${encodeURIComponent(memberKey)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

// ========== Group Aliases ==========
export async function addGroupAlias(env: Env, groupKey: string, alias: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/aliases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ alias }),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function listGroupAliases(env: Env, groupKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group.readonly"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/aliases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.aliases ?? [];
}

export async function deleteGroupAlias(env: Env, groupKey: string, alias: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.group"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/aliases/${encodeURIComponent(alias)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

// ========== Org Units ==========
export async function createOrgUnit(env: Env, body: { name: string; parentOrgUnitPath?: string; description?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.orgunit"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/orgunits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function updateOrgUnit(env: Env, orgUnitPath: string, body: { name?: string; description?: string; parentOrgUnitPath?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.orgunit"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/orgunits/${encodeURIComponent(orgUnitPath)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function getOrgUnit(env: Env, orgUnitPath: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.orgunit.readonly"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/orgunits/${encodeURIComponent(orgUnitPath)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function listOrgUnits(env: Env) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.orgunit.readonly"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/orgunits`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.organizationUnits ?? [];
}

export async function deleteOrgUnit(env: Env, orgUnitPath: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.orgunit"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/orgunits/${encodeURIComponent(orgUnitPath)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

// ========== Roles and Assignments ==========
export async function listRoles(env: Env) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.items ?? [];
}

export async function listRoleAssignments(env: Env, userKey?: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const params = new URLSearchParams();
  if (userKey) params.set("userKey", userKey);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/roleassignments?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.items ?? [];
}

export async function createRoleAssignment(env: Env, body: { roleId: string; assignedTo: string; scopeType?: "CUSTOMER" | "ORG_UNIT"; orgUnitId?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.rolemanagement"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/customer/${customer}/roleassignments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

// ========== Users and Aliases ==========
export async function createUser(env: Env, body: any) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} ${text}`);
  }
  return res.json<any>();
}

export async function updateUser(env: Env, userKey: string, body: any) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google API ${res.status} ${text}`);
  }
  return res.json<any>();
}

export async function makeUserAdmin(env: Env, userKey: string, isAdmin: boolean) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user.security"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}/makeAdmin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ status: isAdmin }),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
}

export async function listUsers(env: Env, domainOrCustomer?: { domain?: string; customer?: string }) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user.readonly"]);
  const params = new URLSearchParams();
  if (domainOrCustomer?.domain) params.set("domain", domainOrCustomer.domain);
  if (domainOrCustomer?.customer) params.set("customer", domainOrCustomer.customer);
  let url = `https://admin.googleapis.com/admin/directory/v1/users?${params.toString()}`;
  const users: any[] = [];
  while (true) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const data = await res.json<any>();
    users.push(...(data.users ?? []));
    if (!data.nextPageToken) break;
    const p = new URLSearchParams(params);
    p.set("pageToken", data.nextPageToken);
    url = `https://admin.googleapis.com/admin/directory/v1/users?${p.toString()}`;
  }
  return users;
}

export async function deleteUser(env: Env, userKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

export async function undeleteUser(env: Env, userKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user"]);
  const customer = env.GOOGLE_CUSTOMER || "my_customer";
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}/undelete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
}

export async function createUserAlias(env: Env, userKey: string, alias: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user.alias"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}/aliases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ alias }),
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  return res.json<any>();
}

export async function listUserAliases(env: Env, userKey: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user.readonly"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}/aliases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json<any>();
  return data.aliases ?? [];
}

export async function deleteUserAlias(env: Env, userKey: string, alias: string) {
  const token = await getAccessToken(env, ["https://www.googleapis.com/auth/admin.directory.user.alias"]);
  const res = await fetch(`https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userKey)}/aliases/${encodeURIComponent(alias)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(`Google API ${res.status}`);
}

async function getAccessToken(env: Env, scopes: string[]): Promise<string> {
  const envScopes = (env.GOOGLE_SCOPES || "").split(",").map(s => s.trim()).filter(Boolean);
  if (envScopes.length > 0) scopes = envScopes;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const iss = env.GOOGLE_CLIENT_EMAIL;
  const sub = env.GOOGLE_SUBJECT || undefined;
  const aud = "https://oauth2.googleapis.com/token";
  const claims: Record<string, unknown> = {
    iss,
    scope: scopes.join(" "),
    aud,
    exp: now + 3600,
    iat: now,
  };
  if (sub) claims.sub = sub;

  const jwt = await signJwt(header, claims, env.GOOGLE_PRIVATE_KEY);

  const res = await fetch(aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Token error ${res.status}`);
  const data = await res.json<any>();
  return data.access_token as string;
}

async function signJwt(header: object, payload: object, pemPrivateKey: string): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const toSign = enc.encode(`${headerB64}.${payloadB64}`);

  const key = await importPrivateKey(pemPrivateKey);
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, toSign);
  const sigB64 = base64url(new Uint8Array(sig));
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function base64url(input: string | ArrayBuffer | Uint8Array): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pemToPkcs8(pem);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const clean = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\r?\n/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}


