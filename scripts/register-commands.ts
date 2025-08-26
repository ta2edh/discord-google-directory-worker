/*
  Run with: npm run register:commands
  Requires env vars: DISCORD_BOT_TOKEN, DISCORD_APP_ID
*/
import 'dotenv/config';

const token = process.env.DISCORD_BOT_TOKEN!;
const appId = process.env.DISCORD_APP_ID!;

async function main() {
  if (!token || !appId) throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_APP_ID');
  const url = `https://discord.com/api/v10/applications/${appId}/commands`;
  const commands = [
    {
      name: 'user',
      description: 'Google Directory kullanıcısını getir',
      type: 1,
      options: [
        { name: 'email', description: 'Kullanıcı e-postası', type: 3, required: true },
      ],
    },
    {
      name: 'group',
      description: 'Grup üyelerini listele',
      type: 1,
      options: [
        { name: 'email', description: 'Grup e-postası', type: 3, required: true },
      ],
    },
    {
      name: 'admin',
      description: 'Google Directory yönetimi',
      type: 1,
      options: [
        {
          type: 2,
          name: 'groups',
          description: 'Gruplar',
          options: [
            { type: 1, name: 'create', description: 'Grup oluştur', options: [
              { type: 3, name: 'email', description: 'group@example.com', required: true },
              { type: 3, name: 'name', description: 'Görünen ad' },
              { type: 3, name: 'description', description: 'Açıklama' },
            ]},
            { type: 1, name: 'update', description: 'Grup güncelle', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'name', description: 'Görünen ad' },
              { type: 3, name: 'description', description: 'Açıklama' },
            ]},
            { type: 1, name: 'get', description: 'Grup al', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
            ]},
            { type: 1, name: 'list', description: 'Grupları listele', options: [
              { type: 3, name: 'domain', description: 'example.com' },
              { type: 3, name: 'customer', description: 'my_customer' },
            ]},
            { type: 1, name: 'list-for-user', description: 'Kullanıcının tüm grupları', options: [
              { type: 3, name: 'user', description: 'user@example.com', required: true },
            ]},
            { type: 1, name: 'delete', description: 'Grup sil', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
            ]},
          ],
        },
        {
          type: 2,
          name: 'members',
          description: 'Grup üyeleri',
          options: [
            { type: 1, name: 'add', description: 'Üye ekle', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'email', description: 'user@example.com', required: true },
              { type: 3, name: 'role', description: 'MEMBER/MANAGER/OWNER' },
            ]},
            { type: 1, name: 'update', description: 'Üyelik güncelle', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'member', description: 'member key/email', required: true },
              { type: 3, name: 'role', description: 'MEMBER/MANAGER/OWNER' },
            ]},
            { type: 1, name: 'list', description: 'Tüm üyeleri listele', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
            ]},
            { type: 1, name: 'remove', description: 'Üye sil', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'member', description: 'member key/email', required: true },
            ]},
          ],
        },
        {
          type: 2,
          name: 'aliases',
          description: 'Grup takma adları',
          options: [
            { type: 1, name: 'add', description: 'Takma ad ekle', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'alias', description: 'alias@example.com', required: true },
            ]},
            { type: 1, name: 'list', description: 'Takma adları listele', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
            ]},
            { type: 1, name: 'delete', description: 'Takma ad sil', options: [
              { type: 3, name: 'group', description: 'group key/email', required: true },
              { type: 3, name: 'alias', description: 'alias@example.com', required: true },
            ]},
          ],
        },
        {
          type: 2,
          name: 'orgunits',
          description: 'Kuruluş birimleri',
          options: [
            { type: 1, name: 'create', description: 'OU oluştur', options: [
              { type: 3, name: 'name', description: 'Ad', required: true },
              { type: 3, name: 'parent', description: '/Parent' },
              { type: 3, name: 'description', description: 'Açıklama' },
            ]},
            { type: 1, name: 'update', description: 'OU güncelle', options: [
              { type: 3, name: 'path', description: '/Parent/Child', required: true },
              { type: 3, name: 'name', description: 'Ad' },
              { type: 3, name: 'description', description: 'Açıklama' },
              { type: 3, name: 'parent', description: 'Yeni Parent' },
            ]},
            { type: 1, name: 'get', description: 'OU al', options: [
              { type: 3, name: 'path', description: '/Parent/Child', required: true },
            ]},
            { type: 1, name: 'list', description: 'OU listele' },
            { type: 1, name: 'delete', description: 'OU sil', options: [
              { type: 3, name: 'path', description: '/Parent/Child', required: true },
            ]},
          ],
        },
        {
          type: 2,
          name: 'roles',
          description: 'Roller',
          options: [
            { type: 1, name: 'list', description: 'Rolleri listele' },
            { type: 1, name: 'assignments', description: 'Rol atamalarını listele', options: [
              { type: 3, name: 'user', description: 'user@example.com' },
            ]},
            { type: 1, name: 'assign', description: 'Rol ata', options: [
              { type: 3, name: 'role_id', description: 'Rol ID', required: true },
              { type: 3, name: 'assigned_to', description: 'User/Group ID', required: true },
              { type: 3, name: 'scope_type', description: 'CUSTOMER/ORG_UNIT' },
              { type: 3, name: 'org_unit_id', description: 'OU ID' },
            ]},
          ],
        },
        {
          type: 2,
          name: 'users',
          description: 'Kullanıcılar',
          options: [
            { type: 1, name: 'create', description: 'Kullanıcı oluştur', options: [
              { type: 3, name: 'email', description: 'user@example.com', required: true },
              { type: 3, name: 'given_name', description: 'Ad', required: true },
              { type: 3, name: 'family_name', description: 'Soyad', required: true },
              { type: 3, name: 'password', description: 'Şifre', required: true },
            ]},
            { type: 1, name: 'update', description: 'Kullanıcı güncelle', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
              { type: 3, name: 'org_unit_path', description: '/OU' },
            ]},
            { type: 1, name: 'make-admin', description: 'Admin yap/çıkar', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
              { type: 3, name: 'status', description: 'true/false', required: true },
            ]},
            { type: 1, name: 'get', description: 'Kullanıcı al', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
            ]},
            { type: 1, name: 'list', description: 'Kullanıcıları listele', options: [
              { type: 3, name: 'domain', description: 'example.com' },
              { type: 3, name: 'customer', description: 'my_customer' },
            ]},
            { type: 1, name: 'delete', description: 'Kullanıcı sil', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
            ]},
            { type: 1, name: 'undelete', description: 'Kullanıcıyı geri al', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
            ]},
          ],
        },
        {
          type: 2,
          name: 'user-aliases',
          description: 'Kullanıcı takma adları',
          options: [
            { type: 1, name: 'create', description: 'Takma ad ekle', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
              { type: 3, name: 'alias', description: 'alias@example.com', required: true },
            ]},
            { type: 1, name: 'list', description: 'Takma adları listele', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
            ]},
            { type: 1, name: 'delete', description: 'Takma ad sil', options: [
              { type: 3, name: 'user', description: 'user key/email', required: true },
              { type: 3, name: 'alias', description: 'alias@example.com', required: true },
            ]},
          ],
        },
      ],
    },
  ];
  for (const c of commands) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bot ${token}` },
      body: JSON.stringify(c),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Command register failed ${res.status} ${text}`);
    }
    console.log('Registered', c.name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


