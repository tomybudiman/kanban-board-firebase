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
 * @description Creates an account in the Auth emulator and returns its uid, email, and ID token.
 */
async function signUp(email) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!body.idToken) {
    throw new Error(`Gagal membuat akun uji: ${JSON.stringify(body)}`);
  }
  return { uid: body.localId, email: body.email, token: body.idToken };
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
const alice = await signUp("alice@example.com");
const bob = await signUp("bob@example.com");
const byAlice = { uid: alice.uid, email: alice.email };
const byBob = { uid: bob.uid, email: bob.email };

// Signed-out access
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

await request("DELETE", "tasks", { admin: true });

for (const result of results) {
  console.log(`${result.passed ? "LULUS" : "GAGAL"}  ${result.name}`);
}
const passedCount = results.filter((result) => result.passed).length;
console.log(`\n${passedCount}/${results.length} lulus`);
process.exit(passedCount === results.length ? 0 : 1);
