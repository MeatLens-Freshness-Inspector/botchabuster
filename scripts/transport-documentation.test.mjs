import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("transport key configuration is documented as backend-only", () => {
  const backendEnv = read("backend/.env.example");
  const deploymentGuide = read("documentation/DEPLOYMENT.md");
  const securityGuide = read("documentation/SECURITY.md");
  const apiReference = read("documentation/API_REFERENCE.md");
  const renderManifest = read("render.yaml");

  assert.match(backendEnv, /^TRANSPORT_RSA_PRIVATE_KEY=/m);
  assert.match(backendEnv, /^TRANSPORT_KEY_ID=v1$/m);
  assert.match(deploymentGuide, /TRANSPORT_RSA_PRIVATE_KEY/);
  assert.match(deploymentGuide, /openssl genpkey .*RSA/);
  assert.match(deploymentGuide, /server-only/i);
  assert.match(securityGuide, /TRANSPORT_RSA_PRIVATE_KEY/);
  assert.match(securityGuide, /AES-256-GCM/);
  assert.match(apiReference, /X-Transport-Key/);
  assert.match(renderManifest, /key: TRANSPORT_RSA_PRIVATE_KEY\s+sync: false/);
  assert.match(renderManifest, /key: TRANSPORT_KEY_ID\s+value: "v1"/);
});

test("frontend environment examples contain no transport secret", () => {
  for (const relativePath of ["frontend/.env.example", ".env.docker.example"]) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /VITE_.*(?:TRANSPORT|AES|RSA|SECRET|PRIVATE_KEY)/i);
  }
});
