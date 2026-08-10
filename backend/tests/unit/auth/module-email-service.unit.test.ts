import assert from "node:assert/strict";
import { test } from "node:test";
import { EmailService } from "../../../src/modules/auth/infrastructure/EmailService";

test("auth module email service accepts a composed transport", async () => {
  let recipient = "";
  const service = new EmailService({
    sendMail: async (options) => {
      recipient = String(options.to);
      return { messageId: "test-message" };
    },
  });

  await service.sendMail("person@example.com", "Subject", "Body");
  assert.equal(recipient, "person@example.com");
});
