// Tests database.rules.json against the Firebase emulators through their REST APIs.
// Run it with `yarn test:rules`, which starts the emulators, runs this file, and stops them again.

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const databaseHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT;

if (!authHost || !databaseHost || !projectId) {
  console.error(
    "Emulator tidak ditemukan. Jalankan lewat `yarn test:rules`, bukan `node` langsung.",
  );
  process.exit(1);
}

const namespace = `ns=${projectId}-default-rtdb`;
const password = "rahasia123";

// A task that passes every rule; each test changes one thing about it.
const validTask = {
  title: "Uji rules",
  description: "",
  status: "todo",
  priority: "medium",
  startDate: "2026-09-29",
  deadline: "2026-09-30",
};

const results = [];

/**
 * @description Calls an Identity Toolkit endpoint of the Auth emulator (e.g. "accounts:signUp") and returns the parsed response.
 */
async function authApi(endpoint, body) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/${endpoint}?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${endpoint} gagal: ${JSON.stringify(result)}`);
  }
  return result;
}

/**
 * @description Creates an account in the Auth emulator and returns its uid, email, and ID token. The email is not verified yet.
 */
async function signUp(email) {
  const body = await authApi("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  return { uid: body.localId, email: body.email, token: body.idToken };
}

/**
 * @description Signs an existing account in again and returns it with a new ID token.
 */
async function signIn(email) {
  const body = await authApi("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  return { uid: body.localId, email: body.email, token: body.idToken };
}

/**
 * @description Verifies an account's email the way a real user does: asks Firebase to send the verification email, takes the code from the link (the emulator keeps sent emails instead of sending them), and applies it. Returns the account signed in again, because only a new ID token carries email_verified: true.
 */
async function verifyEmail(user) {
  await authApi("accounts:sendOobCode", {
    requestType: "VERIFY_EMAIL",
    idToken: user.token,
  });
  const response = await fetch(
    `http://${authHost}/emulator/v1/projects/${projectId}/oobCodes`,
  );
  const { oobCodes } = await response.json();
  const code = oobCodes.findLast(
    (entry) =>
      entry.email === user.email && entry.requestType === "VERIFY_EMAIL",
  );
  if (!code) {
    throw new Error(`Kode verifikasi untuk ${user.email} tidak ditemukan`);
  }
  await authApi("accounts:update", { oobCode: code.oobCode });
  return signIn(user.email);
}

/**
 * @description Sends a REST request to the database emulator, as the given user, as an admin that bypasses the rules, or signed out when neither is given.
 */
async function request(method, path, { user, admin, body } = {}) {
  const params = [namespace];
  if (user) params.push(`auth=${user.token}`);
  const headers = { "Content-Type": "application/json" };
  if (admin) headers.Authorization = "Bearer owner";
  const response = await fetch(
    `http://${databaseHost}/${path}.json?${params.join("&")}`,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/**
 * @description Records whether a request was allowed (HTTP 200) or denied (401/403) as expected.
 */
function expectRequest(name, response, shouldBeAllowed) {
  const isAllowed = response.status === 200;
  const isDenied = response.status === 401 || response.status === 403;
  results.push({ name, passed: shouldBeAllowed ? isAllowed : isDenied });
}

/**
 * @description Creates a fresh valid task as an admin and returns its path, so every update test starts from the same state.
 */
async function seedTask(createdBy) {
  const response = await request("POST", "tasks", {
    admin: true,
    body: { ...validTask, createdBy },
  });
  return `tasks/${response.body.name}`;
}

await request("DELETE", "tasks", { admin: true });
await request("DELETE", "users", { admin: true });
// Alice and Bob have verified their email; Carol has not (yet).
const alice = await verifyEmail(await signUp("alice@example.com"));
const bob = await verifyEmail(await signUp("bob@example.com"));
const carol = await signUp("carol@example.com");
const byAlice = { uid: alice.uid, email: alice.email };
const byBob = { uid: bob.uid, email: bob.email };

// Signed-out and unverified access
expectRequest(
  "Belum verifikasi email: baca /tasks ditolak",
  await request("GET", "tasks", { user: carol }),
  false,
);
expectRequest(
  "Belum verifikasi email: buat task ditolak",
  await request("POST", "tasks", {
    user: carol,
    body: { ...validTask, createdBy: { uid: carol.uid, email: carol.email } },
  }),
  false,
);
expectRequest(
  "Tanpa login: baca /tasks ditolak",
  await request("GET", "tasks"),
  false,
);
expectRequest(
  "Tanpa login: buat task ditolak",
  await request("POST", "tasks", {
    body: { ...validTask, createdBy: byAlice },
  }),
  false,
);

// Creating tasks
const create = (body) => request("POST", "tasks", { user: alice, body });
expectRequest(
  "Login: baca /tasks boleh",
  await request("GET", "tasks", { user: alice }),
  true,
);
expectRequest(
  "Task valid boleh dibuat",
  await create({ ...validTask, createdBy: byAlice }),
  true,
);
expectRequest(
  "Deskripsi kosong dan tanggal mulai = deadline boleh",
  await create({
    ...validTask,
    deadline: validTask.startDate,
    createdBy: byAlice,
  }),
  true,
);
expectRequest("Tanpa createdBy ditolak", await create(validTask), false);
expectRequest(
  "createdBy dengan uid orang lain ditolak",
  await create({
    ...validTask,
    createdBy: { uid: bob.uid, email: alice.email },
  }),
  false,
);
expectRequest(
  "createdBy dengan email orang lain ditolak",
  await create({
    ...validTask,
    createdBy: { uid: alice.uid, email: bob.email },
  }),
  false,
);
expectRequest(
  "createdBy tidak lengkap ditolak",
  await create({ ...validTask, createdBy: { uid: alice.uid } }),
  false,
);
expectRequest(
  "createdBy dengan field tambahan ditolak",
  await create({ ...validTask, createdBy: { ...byAlice, role: "admin" } }),
  false,
);

// Validating each field on create
const invalidFields = [
  ["Judul kosong ditolak", { title: "" }],
  ["Judul berisi spasi saja ditolak", { title: "   " }],
  ["Judul lebih dari 200 karakter ditolak", { title: "a".repeat(201) }],
  ["Judul bukan string ditolak", { title: 123 }],
  [
    "Deskripsi lebih dari 2000 karakter ditolak",
    { description: "a".repeat(2001) },
  ],
  ["Status di luar todo/in_progress/done ditolak", { status: "selesai" }],
  ["Prioritas di luar low/medium/high ditolak", { priority: "urgent" }],
  ["Format tanggal mulai salah ditolak", { startDate: "29-09-2026" }],
  ["Format deadline salah ditolak", { deadline: "2026/09/30" }],
  ["Deadline sebelum tanggal mulai ditolak", { deadline: "2026-09-28" }],
  ["Field tambahan ditolak", { extra: "tidak dikenal" }],
];
for (const [name, change] of invalidFields) {
  expectRequest(
    name,
    await create({ ...validTask, ...change, createdBy: byAlice }),
    false,
  );
}
const withoutDeadline = { ...validTask };
delete withoutDeadline.deadline;
expectRequest(
  "Task tanpa deadline ditolak",
  await create({ ...withoutDeadline, createdBy: byAlice }),
  false,
);

// Updating tasks (the board is shared, so Bob may edit Alice's task)
let path = await seedTask(byAlice);
const update = (body, user = bob) => request("PATCH", path, { user, body });
expectRequest(
  "User lain ubah status boleh",
  await update({ status: "done" }),
  true,
);
expectRequest(
  "User lain edit detail boleh",
  await update({
    title: "Diedit Bob",
    priority: "high",
    deadline: "2026-10-05",
  }),
  true,
);
expectRequest(
  "Ubah status ke nilai tidak valid ditolak",
  await update({ status: "selesai" }),
  false,
);
expectRequest(
  "Ubah judul jadi kosong ditolak",
  await update({ title: "" }),
  false,
);
expectRequest(
  "Ubah tanggal mulai jadi setelah deadline ditolak",
  await update({ startDate: "2026-12-01" }),
  false,
);
expectRequest(
  "Ubah deadline jadi sebelum tanggal mulai ditolak",
  await update({ deadline: "2026-01-01" }),
  false,
);
expectRequest("Tambah field baru ditolak", await update({ extra: "x" }), false);
expectRequest(
  "Ganti createdBy ditolak",
  await update({ createdBy: byBob }),
  false,
);
expectRequest(
  "Ganti createdBy/uid saja ditolak",
  await request("PUT", `${path}/createdBy/uid`, { user: bob, body: bob.uid }),
  false,
);
expectRequest(
  "Hapus createdBy ditolak",
  await request("DELETE", `${path}/createdBy`, { user: bob }),
  false,
);
expectRequest(
  "Timpa task tanpa createdBy ditolak",
  await request("PUT", path, { user: bob, body: validTask }),
  false,
);
expectRequest(
  "Pembuatnya sendiri juga tidak bisa ganti createdBy",
  await update(
    { createdBy: { uid: alice.uid, email: "lain@example.com" } },
    alice,
  ),
  false,
);
const stored = await request("GET", path, { admin: true });
results.push({
  name: "Setelah semua percobaan, createdBy tetap milik pembuat",
  passed:
    stored.body?.createdBy?.uid === alice.uid &&
    stored.body?.createdBy?.email === alice.email &&
    stored.body?.title === "Diedit Bob",
});

// Tasks created before sign-in was added (no createdBy)
await request("PUT", "tasks/legacy", { admin: true, body: validTask });
expectRequest(
  "Task lama tanpa createdBy: ubah status boleh",
  await request("PATCH", "tasks/legacy", {
    user: alice,
    body: { status: "in_progress" },
  }),
  true,
);
expectRequest(
  "Task lama: hapus boleh",
  await request("DELETE", "tasks/legacy", { user: alice }),
  true,
);

// Deleting tasks
path = await seedTask(byAlice);
expectRequest(
  "Tanpa login: hapus task ditolak",
  await request("DELETE", path),
  false,
);
expectRequest(
  "User lain hapus task boleh",
  await request("DELETE", path, { user: bob }),
  true,
);
expectRequest(
  "Tulis langsung ke /tasks (bukan /tasks/{id}) ditolak",
  await request("PUT", "tasks", { user: alice, body: {} }),
  false,
);

// User profiles at /users/{uid}
const carolPath = `users/${carol.uid}`;
const profile = (user, isVerified) => ({ email: user.email, isVerified });
const writeCarol = (body, user = carol) =>
  request("PUT", carolPath, { user, body });
expectRequest(
  "Tanpa login: baca data user ditolak",
  await request("GET", carolPath),
  false,
);
expectRequest(
  "Belum verifikasi: simpan data sendiri dengan isVerified false boleh",
  await writeCarol(profile(carol, false)),
  true,
);
expectRequest(
  "Belum verifikasi: isVerified true ditolak",
  await writeCarol(profile(carol, true)),
  false,
);
expectRequest(
  "Baca data sendiri boleh",
  await request("GET", carolPath, { user: carol }),
  true,
);
expectRequest(
  "Baca data user lain ditolak",
  await request("GET", carolPath, { user: alice }),
  false,
);
expectRequest(
  "Baca seluruh /users ditolak",
  await request("GET", "users", { user: carol }),
  false,
);
expectRequest(
  "Tulis data user lain ditolak",
  await writeCarol(profile(alice, true), alice),
  false,
);
expectRequest(
  "Email yang berbeda dengan akun ditolak",
  await writeCarol({ email: "lain@example.com", isVerified: false }),
  false,
);
expectRequest(
  "isVerified bukan boolean ditolak",
  await writeCarol({ email: carol.email, isVerified: "false" }),
  false,
);
expectRequest(
  "Data tanpa isVerified ditolak",
  await writeCarol({ email: carol.email }),
  false,
);
expectRequest(
  "Data user dengan field tambahan ditolak",
  await writeCarol({ ...profile(carol, false), role: "admin" }),
  false,
);
expectRequest(
  "Hapus data sendiri ditolak",
  await request("DELETE", carolPath, { user: carol }),
  false,
);
expectRequest(
  "Hapus email saja ditolak",
  await request("DELETE", `${carolPath}/email`, { user: carol }),
  false,
);

// After Carol verifies her email
const verifiedCarol = await verifyEmail(carol);
expectRequest(
  "Token lama dari sebelum verifikasi: isVerified true tetap ditolak",
  await writeCarol(profile(carol, true)),
  false,
);
expectRequest(
  "Sudah verifikasi (token baru): ubah isVerified jadi true boleh",
  await request("PATCH", carolPath, {
    user: verifiedCarol,
    body: { isVerified: true },
  }),
  true,
);
expectRequest(
  "Sudah verifikasi: isVerified false ditolak",
  await request("PATCH", carolPath, {
    user: verifiedCarol,
    body: { isVerified: false },
  }),
  false,
);
expectRequest(
  "Sudah verifikasi: baca /tasks boleh",
  await request("GET", "tasks", { user: verifiedCarol }),
  true,
);
const storedProfile = await request("GET", carolPath, { admin: true });
results.push({
  name: "Data Carol akhirnya { email, isVerified: true }",
  passed:
    storedProfile.body?.email === carol.email &&
    storedProfile.body?.isVerified === true &&
    Object.keys(storedProfile.body ?? {}).length === 2,
});

await request("DELETE", "tasks", { admin: true });
await request("DELETE", "users", { admin: true });

for (const result of results) {
  console.log(`${result.passed ? "LULUS" : "GAGAL"}  ${result.name}`);
}
const passedCount = results.filter((result) => result.passed).length;
console.log(`\n${passedCount}/${results.length} lulus`);
process.exit(passedCount === results.length ? 0 : 1);
