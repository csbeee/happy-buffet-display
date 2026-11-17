const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("kiosk uses callable functions rather than direct Firestore reads", () => {
  const source = read("meal-management/meal-entry.js");
  assert.match(source, /getMealEntryCompaniesCall/);
  assert.match(source, /getCompanyRosterCall/);
  assert.match(source, /submitMealEntryCall/);
  assert.doesNotMatch(source, /firebase-firestore|\bgetDocs\s*\(|\bcollection\s*\(/);
});

test("kiosk and server accept signature without a representative name", () => {
  const kiosk = read("meal-management/meal-entry.js");
  const html = read("meal-management/index.html");
  const functions = read("functions/index.js");
  assert.doesNotMatch(kiosk, /representativeName/);
  assert.doesNotMatch(html, /representativeName|그룹 대표자 이름/);
  assert.doesNotMatch(functions, /representativeName/);
  assert.match(kiosk, /signatureDataUrl/);
  assert.match(functions, /signatureDataUrl/);
});

test("all public callable functions explicitly disable App Check", () => {
  const functions = read("functions/index.js");
  assert.equal((functions.match(/enforceAppCheck:\s*false/g) || []).length, 4);
  assert.doesNotMatch(functions, /enforceAppCheck:\s*true/);
});

test("Firestore denies anonymous access except read-only public menu data", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /request\.auth\.token\.email == "seob1984@gmail\.com"/);
  assert.match(rules, /match \/todayMenu\/\{documentId\}[\s\S]*?allow read: if true;[\s\S]*?allow write: if isAdmin\(\);/);
  assert.match(rules, /match \/menus\/\{menuId\}[\s\S]*?allow read: if true;[\s\S]*?allow write: if isAdmin\(\);/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*?allow read, write: if isAdmin\(\);/);
});

test("test preview deploys Hosting only to the isolated Spark project", () => {
  const workflow = read(".github/workflows/firebase-hosting-mobile-test.yml");
  assert.match(workflow, /TEST_PROJECT_ID" != "happybuffet-test"/);
  assert.match(workflow, /firebase hosting:channel:deploy mobile-test/);
  assert.doesNotMatch(workflow, /firebase deploy|functions|firestore:rules/);
  assert.equal(
    fs.existsSync(path.join(__dirname, "..", ".github/workflows/deploy-firebase-backend.yml")),
    false,
    "Cloud Functions backend deployment workflow must not be present in the free-only branch"
  );
});

test("admin menu initializes only after successful Google admin authentication", () => {
  const auth = read("admin/auth.js");
  const app = read("admin/app.js");
  assert.match(auth, /happybuffet-admin-auth-ready/);
  assert.match(app, /happybuffet-admin-auth-ready/);
  assert.doesNotMatch(app, /document\.addEventListener\("DOMContentLoaded", init/);
});

test("both Firebase client modules stay on the isolated test project and SDK version", () => {
  const config = read("firebase/firebase-config.js");
  const firestore = read("firebase/firestore.js");
  assert.match(config, /projectId: "happybuffet-test"/);
  assert.match(firestore, /projectId: "happybuffet-test"/);
  assert.doesNotMatch(config + firestore, /projectId: "todaymenu-30fe7"/);
  assert.doesNotMatch(firestore, /firebasejs\/11\.10\.0/);
  assert.match(firestore, /firebasejs\/12\.0\.0/);
});

test("server validates selected roster ownership and records the current company meal price", () => {
  const functions = read("functions/index.js");
  assert.match(functions, /rosterSnaps\.some\(\(snap\) =>[\s\S]*?snap\.data\(\)\.companyId !== companyId[\s\S]*?snap\.data\(\)\.active === false/);
  assert.match(functions, /mealPrice: savedMealPrice/);
  assert.match(functions, /totalAmount: headcount \* savedMealPrice/);
});
