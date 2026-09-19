# MeatLens User Manual

**Official controlled document**  
**Version:** 1.1  
**Status:** Approved for production  
**Effective date:** 31 August 2026  
**Applies to:** MeatLens web and Capacitor client workflows  
**Document owner:** MeatLens project team

This manual explains how to operate, administer, and maintain MeatLens. It is written for inspectors/users, administrators, and developers. The manual describes the implementation present in this repository as of the effective date. Statements labeled **Supported** describe current behavior. Statements labeled **Planned / roadmap** identify future or unverified capability and must not be treated as an operational instruction.

> **Official-use note:** MeatLens provides AI-assisted decision support. Users must follow applicable food-safety rules, local inspection procedures, and organizational approvals. A model classification does not replace a qualified human decision or regulatory requirement.

[[PAGEBREAK]]

## Contents

- Shared orientation
- Inspector/User guide
- Administrator guide
- Developer guide
- Reference and support
- Document control

## Shared orientation

### Mobile visual guide

The mobile figures in this manual use green numbered markers. Follow the numbers in order when a figure shows a multi-step interaction; each marker points to the control named in the caption. The screenshots use a 390 x 844 phone viewport and reflect the current responsive MeatLens layouts. If a control is below the first viewport, scroll within the page until the matching label is visible.

## How to use this manual

Start with the role matrix below. Inspectors should read the shared orientation and Inspector/User guide. Administrators should read the shared orientation and Administrator guide. Developers should read the Developer guide before changing configuration, models, routes, migrations, or deployment settings.

## Role matrix

| Role | Primary responsibilities | Main areas | Access boundary |
|---|---|---|---|
| Inspector / user | Capture inspections, review AI-assisted results, save records, and follow up | Inspect, History, Messages, Profile, Help | Own inspection scope and permitted conversations |
| Administrator | Manage users, access codes, markets, inspection records, reports, disputes, and audit data | Admin workspace | Organization-wide administrative data; role-gated actions |
| Developer | Maintain models, datasets, API integrations, training artifacts, and technical configuration | Developer workspace inside Admin | Developer-only options and data operations; treat exported data as sensitive |

## MeatLens at a glance

MeatLens combines a React/Vite/Capacitor client, an Express API, Supabase PostgreSQL/Auth/Storage, and local ONNX model inference. A typical inspection follows this sequence:

1. The inspector signs in or completes access-code onboarding.
2. The inspector completes the pre-scan protocol and selects a market location.
3. The inspector captures or selects an image.
4. The client runs the configured MobileNetV3Small inference locally.
5. The inspector reviews classification, confidence, explanation, and protocol findings.
6. The record and image are uploaded and saved when the inspector chooses **Save Record**.
7. The saved record appears in History and can be reviewed by authorized administrators.

[[FIG:system-flow.png|Figure 1. MeatLens request and persistence flow|System flow from the React/Vite/Capacitor client through Express modules and Supabase services.]]

## Classification and confidence language

The application assesses meat freshness only and uses the classifications **fresh**, **not fresh**, and **spoiled**. It does not assess sickness, illness, pathogens, contamination, or other health conditions. A result also includes a confidence score and an explanation. Confidence is a model measure, not a guarantee. Record the surrounding inspection facts and use the result together with the pre-scan protocol and applicable policy.

### Supported versus planned

The manual uses these labels consistently:

- **Supported:** implemented in the tracked application or explicitly required by the current documentation and route source.
- **Source-verified interface:** an interface is present in the current source but could not be opened in the local capture session.
- **Planned / roadmap:** mentioned in project notes or future work and not asserted as available for routine operations.

[[PAGEBREAK]]

# Inspector/User guide

## Before you begin

Confirm that you have:

- A supported account or a valid onboarding access code.
- For the best capture and processing experience, a device running Android 12 or iOS 22, with at least 8 GB of RAM and a camera of at least 50 MP. These are recommendations, not requirements; lower-spec devices may still work with possible image-quality or performance differences.
- Permission to use the camera or select an image, if your device requires it.
- The correct market/location context.
- A live connection for sign-in, messaging, and upload. Cached inspection and profile basics may remain available offline after a prior authenticated session.

## Quick click paths

Use these paths when you already know what you need to do:

- **New inspection:** `Inspect` -> complete **Pre-Scan Safety Protocol** -> choose a value in **Location Selection** -> **Open Camera** -> **Capture** -> **Analyze Sample** -> review **Analysis Output** -> **Save Record**.
- **Start over:** `Inspect` -> **New Scan**. This clears the current capture, result, checklist, and coordinates. Use it only after confirming that the current unsaved work is no longer needed.
- **Review a saved record:** `History` -> use search/filter controls -> select the record -> review the detail panel.
- **Request a password reset:** `Login` -> **Forgot password?** -> enter **Email** -> **Send Reset Link** -> open the email link -> enter **New Password** and **Confirm Password** -> **Update Password**.
- **Change a signed-in password:** `Profile` -> **Change Password** -> enter the three password fields -> **Change Password** -> confirm **Change Password** in the confirmation dialog.
- **Open administrative tools:** authenticated app -> **Admin** -> choose **Overview**, **Users**, **Inspections**, **Disputes**, **Access Codes**, **Markets**, **Reports**, **Logs**, or **Developer Settings**.

## Create an account and complete onboarding

[[FIG:mobile-signup-annotated.png|Figure 3. Mobile Create Account form|Mobile Create Account form. Green numbered markers show the fields and action to use in order: Full Name, Email, Password, Access Code, then Create Account.]]

**Supported.** New users create an account through **Sign up** and provide the access code issued by an administrator. The code controls onboarding eligibility; it is not a substitute for the user’s password.

1. Open the MeatLens landing page and select **Create Inspector Account** or **Sign up**.
2. On **Create Account**, enter **Full Name**, **Email**, **Password**, and **Access Code**.
3. If shown, open **Report Header Organization** and choose the organization that should appear on reports.
4. Select the checkbox for **I agree to the MeatLens Terms and Conditions.**. Use **View Terms and Conditions** first if you need to read the terms.
5. Select the checkbox for **I have read the MeatLens Privacy Policy.**. Use **View Privacy Policy** first if you need to read the policy.
6. Select **Create Account**. Wait for the confirmation message or email-verification instruction; do not submit repeatedly.
7. Return to **Sign In** and enter the same **Email** and **Password**, then select **Sign In**.
8. If **Onboarding** opens, complete each required profile, organization, and location field and select the page’s continue/finish action.
9. Confirm that the authenticated navigation shows **Inspect** before starting an inspection.

If the code is invalid, expired, inactive, or already consumed according to the organization’s policy, contact an administrator. Do not copy access codes into tickets, screenshots, or chat messages.

## Sign in, recover a password, and manage a session

**Supported.** Use **Login** for normal access. The recovery flow uses a secure email link and does not ask the user to enter a separate code.

### Sign in

[[FIG:mobile-login-annotated.png|Figure 4. Mobile Sign In form|Mobile Sign In form. Green numbered markers show Email, Password, Sign In, and the Forgot password? link.]]

1. Open `/login` or select **Sign In** from the landing page.
2. Enter the account email in **Email**.
3. Enter the account password in **Password**.
4. Select **Sign In**.
5. If the account supports it, **Unlock with Passkey** or **Sign In with Passkey** may be used instead. Follow the device prompt and do not share the passkey.
6. After authentication, select **Inspect**, **History**, **Messages**, or **Profile** from the user navigation. Administrators also receive **Admin** access.

### Recover a password

1. On **Login**, select **Forgot password?**.
2. Enter the account email in **Email**.
3. Select **Send Reset Link**.
4. Open the newest password-reset email and select its reset link once. Use the newest message if several links were requested.
5. Confirm that the browser opens `/reset-password`, not only the public landing page. If the link is invalid or expired, return to **Forgot password?** and request a fresh link.
6. On **New Password**, enter **New Password** and enter the same value again in **Confirm Password**.
7. Select **Update Password**. Return to **Sign In** and test the new password.

The reset link is single-use and time-limited. Do not copy the link into chat or tickets.

### Change a password while signed in

1. Select **Profile**.
2. Select **Change Password**.
3. Enter **Current password**, **New password**, and **Confirm new password**.
4. Select **Change Password**.
5. In **Change your password?**, select **Change Password** again to confirm.
6. Wait for **Password changed successfully.** before closing the dialog.

The application uses Supabase Auth plus an application session; unsafe cookie requests require CSRF protection.

If the session is idle for too long, the inactivity guard may return you to login. Sign in again rather than reusing a token copied from another device. Native/bearer clients and browser clients use different transport paths; users do not need to manage those tokens manually.

## Run an inspection

### 1. Complete the pre-scan protocol

[[FIG:mobile-inspect-prescan-annotated.png|Figure 5. Mobile pre-scan checklist, upper fields|Mobile Pre-Scan Safety Protocol view. Green numbered markers identify the upper checklist fields visible in the first mobile viewport.]]

[[FIG:mobile-inspect-prescan-lower-annotated.png|Figure 6. Mobile pre-scan checklist, Area Clean|Mobile lower checklist view. Marker 1 identifies the Area Clean selector, which may require a short scroll on a phone.]]

**Supported.** The inspection workspace presents a pre-scan checklist before capture. Complete every required field, including the certificate/proof reference and the available protocol observations. If a protocol condition fails, MeatLens may produce a protocol-driven spoiled decision even when the visual model result would otherwise differ.

On **Inspect**, locate the **Pre-Scan Safety Protocol** card and complete the controls in the following order:

1. Click **Stall Number** and enter the stall identifier, for example `12-A`.
2. Click **Meat Inspection Certificate Proof** and enter the certificate number or proof reference.
3. Click **Meat Expiry Date** and choose the date using the date picker, or type the date in the browser’s date control.
4. Open **Storage Correct**, choose **Yes** or **No**, and do not leave the field at **Select answer**.
5. Open **Light Color Correct** and choose **Yes** or **No**. If you choose **No**, click **What Color?** and describe the observed light color.
6. Open **Area Clean** and choose **Yes** or **No**.
7. Recheck every value before moving to the camera. The card should show **Checklist Complete**.

The application’s current protocol behavior is explicit: a safety answer of **No** skips AI analysis and records the inspection as spoiled through the protocol path. Do not choose an answer merely to unlock the camera. If an answer is unknown, stop and follow the organization’s escalation procedure.

Meat type is not a rejection gate in this workflow. Non-pork records are allowed and retained for future purposes in line with DTI guidance; do not reject a record solely because the sample is non-pork.

Do not select an answer merely to unlock the camera. If an answer is unknown, stop and follow the organization’s escalation procedure.

### 2. Select a market location

[[FIG:mobile-inspect-location-camera-annotated.png|Figure 7. Mobile location selection and camera entry|Mobile Capture Station view. Marker 1 identifies the manual market selector; marker 2 identifies Open Camera.]]

1. In **Capture Station**, click **Location Selection**.
2. Open the **Select market location** list.
3. Click the market/location supplied by the administrator.
4. Confirm that **Saved to report:** shows the intended market before capture.
5. If the device requests location permission, allow it when authorized. GPS coordinates are captured separately when available; MeatLens does not auto-assign the nearest configured market.

### 3. Capture or select an image

[[FIG:mobile-inspect-capture-confirm-annotated.png|Figure 8. Mobile captured-image confirmation|Mobile captured-image view. Marker 1 identifies Retake and marker 2 identifies Use Photo.]]

1. Confirm the pre-scan card shows **Checklist Complete** and a market is shown under **Saved to report**.
2. Click **Open Camera**. On a phone, approve the browser camera prompt if it appears.
3. Position the meat inside the visible capture area. Keep the subject clear and well lit; avoid glare, excessive distance, motion blur, and unrelated objects.
4. When the live preview is ready, click **Capture**. If the image is poor, click **Retake** and capture again.
5. Review the preview and click **Use Photo** or the confirmation control shown by the capture component.

In controlled developer environments, an enabled file-upload control may also be available. Ordinary inspectors should use **Open Camera** and should not enable or rely on developer-only capture options.

### 4. Analyze the image

1. After the image is accepted, locate the **Analyze Sample** button below the capture area.
2. Click **Analyze Sample** once.
3. If the button reads **Preparing MobileNetV3...**, wait for the model to finish loading. If it reads **Analyzing sample...**, leave the page open until the result appears.
4. Do not click repeatedly or replace the image while analysis is running.

The client performs the primary MobileNetV3Small ONNX inference locally.

### 5. Review the analysis output

[[FIG:mobile-inspect-analysis-annotated.png|Figure 9. Mobile Analysis Output card|Mobile Analysis Output card with marker 1 identifying the card heading. Review the classification, confidence, source, explanation, and recommendation below it.]]

Read the **Analysis Output** card and confirm:

- Classification and freshness badge.
- Model confidence percentage.
- Explanation and any flagged deviations.
- Inspection decision source, especially if the protocol affected the result.
- Any regulatory-compliance reason shown by the workflow.

The result is decision support. When the result conflicts with physical evidence or policy, follow the approved human review path and record the issue through the available dispute or escalation process.

### 6. Save the inspection

[[FIG:mobile-inspect-save-annotated.png|Figure 10. Mobile inspection save actions|Mobile inspection action bar before saving. Marker 1 identifies New Scan and marker 2 identifies Save Record.]]

1. Check the location, checklist, image, classification, confidence, and decision source. The current Inspect workspace does not display an inspector-notes input; do not delay saving while looking for one.
2. Click **Save Record**.
3. While the request is being sent, the button reads **Saving...**. Do not click it again.
4. When the server accepts the record, the button reads **Record Saved** and the record becomes available in **History**.
5. If the device is offline and the record is placed in the local queue, the button reads **Queued for Sync**. Keep the device connected later until synchronization completes.
6. To clear the workspace, click **New Scan**. This is the current label; there is no **Reset** button in the inspection action bar.

[[FIG:mobile-inspect-record-saved-annotated.png|Figure 11. Mobile saved-record state|Mobile inspection action bar after saving. Marker 1 identifies the disabled Record Saved state and marker 2 identifies New Scan.]]

## Review inspection history

[[FIG:mobile-history-annotated.png|Figure 12. Mobile History timeline controls|Mobile History timeline. Green numbered markers identify search, the Inspection Day control, and Export PDF.]]

[[FIG:mobile-history-detail-annotated.png|Figure 13. Mobile inspection detail view|Mobile inspection detail view. Marker 1 identifies the close control; the detail panel contains the record's classification, confidence, date, time, meat type, location, and review fields.]]

**Supported.** Open **History** to review records in your permitted scope. The page provides summary cards for total records, average confidence, fresh rate, and spoiled rate, plus a timeline and classification/monthly insights.

1. Select **History** from the authenticated user navigation.
2. Use the search field to enter a meat type, market/location, classification, or record identifier when searching for a specific record.
3. Open the classification filter and choose the needed classification, or clear it to restore all classifications.
4. Use the date/report-day control when you need to focus on a particular inspection date.
5. Select a record card or row to open its detail view.
6. In the detail view, review the image, location, dates, classification, confidence, decision source, pre-scan values, and any displayed inspector notes.
7. If the record is disputed, use the detail view’s dispute action, enter the expected result and reason, then submit the dispute for administrative review. Do not create a duplicate inspection just to challenge a result.

### Export a detailed inspection PDF

1. Set the required date/report scope on **History**.
2. Select the available export action for the current report scope.
3. Wait for the progress indicator to finish before navigating away.
4. Open the downloaded PDF and confirm that the date range and inspection details are correct.
5. Store the file only in an approved location; do not share it through personal channels.

## Use Messages and the assistant

[[FIG:mobile-messages-contacts-annotated.png|Figure 14. Mobile Messages contact directory|Mobile Messages contact directory. Green numbered markers identify contact search, Refresh messages, and the contact to open.]]

[[FIG:mobile-messages-thread-annotated.png|Figure 15. Mobile Messages conversation thread|Mobile conversation thread. Green numbered markers identify Back to contacts, the message composer, and Send.]]

**Supported.** Open **Messages** to search permitted contacts, select a conversation, and send a message. Messaging requires a live backend session; it pauses when the app is offline.

1. Select **Messages** from the authenticated user navigation.
2. Use the contact search field to find a permitted user.
3. Select the contact or existing conversation to open the thread.
4. Click the message composer, type the operational message, and select **Send**.
5. If the connection indicator shows a disconnected state, restore network access and select **Reconnect**. In the contact directory, use the refresh icon with accessible label **Refresh messages** if the list does not update.

The assistant widget is available when online authentication permits it. Use messages and assistant prompts for operational coordination, not for storing passwords, access codes, session tokens, or unapproved personal data.


## Work offline and synchronize safely

**Supported.** The application caches selected inspection and profile information for offline-friendly workflows. Pending inspection uploads and audit events are held in bounded local queues and synchronize when the application regains the required session and connectivity.

- Do not clear application storage while a pending scan or audit queue is needed.
- Keep the device charged and connected until the sync process completes.
- If a record remains pending, note the inspection time and contact an administrator rather than creating duplicates immediately.
- Messaging is online-only even when cached inspections remain available.

## Profile, help, and tutorial pages

[[FIG:mobile-profile-password-annotated.png|Figure 16. Mobile Change Password dialog|Mobile Change Password dialog. Green numbered markers identify Current password, New password, Confirm new password, and Change Password.]]

1. Select **Profile** from the authenticated user navigation.
2. Review the displayed account and organization/location information.
3. Use the profile edit control when you need to change permitted profile fields, then save the form and wait for its success message.
4. Select **Change Password** to follow the password-change procedure above.
5. Select the tutorial link to open `/profile/tutorial`.
6. Select **Help** for general help or the inspection-scope help link for `/profile/help/scope`.

Keep profile information accurate because organization/location context can affect administrative reporting.

## Inspector troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Cannot proceed to capture | Pre-scan checklist is incomplete | Complete every required checklist field with accurate data |
| Analysis action is disabled | No valid image, checklist, or model readiness | Confirm the capture, wait for model warm-up, then try again |
| Upload fails | Network, session, storage, or file-size problem | Keep the local record, restore connectivity, sign in again if requested, and retry once |
| Messages pause | Offline or expired online session | Restore network access and reconnect; do not paste tokens into chat |
| History is empty | Wrong scope, filters, or pending synchronization | Clear filters, confirm the date, and wait for sync |
| A result appears unsafe or inconsistent | Model uncertainty or protocol deviation | Follow human review and regulatory escalation procedures; record notes |

[[PAGEBREAK]]

# Administrator guide

## Open the Admin workspace

[[FIG:mobile-admin-overview-annotated.png|Figure 17. Mobile Admin workspace selector|Mobile Admin workspace overview. Marker 1 identifies the workspace selector used to change administrative areas.]]

[[FIG:mobile-admin-selector-annotated.png|Figure 18. Mobile Admin area selector|Mobile Admin area selector opened from the current tab. Markers identify Reports and Users as examples of destinations in the selector.]]

**Supported.** An administrator or developer selects the admin entry point from the authenticated application. The route is protected by the admin guard. Developers are treated as administrators for admin data access and also receive the separate developer workspace.

On desktop, the workspace uses a left navigation rail. On mobile, the same areas are exposed through the workspace selector and mobile-specific layouts. The current tab labels are **Overview**, **Users**, **Inspections**, **Disputes**, **Access Codes**, **Markets**, **Reports**, **Logs**, and **Developer Settings** when developer access is present.

To change areas, click the tab in the desktop navigation rail. On a phone, open the admin workspace selector, click the current tab name, and choose the destination tab. If a tab is not listed, the signed-in role does not have access to it.

## Overview

The Overview tab opens first. Review the summary cards and charts for inspection volume, freshness mix, confidence, inspector activity, meat-type distribution, and location activity. Click another tab when you need the underlying records. Treat aggregate metrics as operational signals; investigate the underlying records before making a compliance decision.

## Manage users

**Supported.** The Users area lists profiles and supports administrator actions permitted by the current role. Search before creating a duplicate user. When creating or updating a user, confirm full name, email, role/permissions, inspector code, report organization, and location according to the organization’s approval process.

### Create a user

1. Click **Users**.
2. In **Add User**, fill **Full Name**, **Email**, **Password**, and **Inspector Code**.
3. Open **Report Header Organization** and choose the report organization.
4. Fill **Location**.
5. Click **Create User** and wait for the success response.

Search the registered-user list before creating an account so that the person does not receive a duplicate profile.

### Edit or delete a user

Before deleting or changing a user:

1. Confirm the intended account using more than one identifying field.
2. Confirm the change is authorized and recorded by local policy.
3. Explain any impact on access, inspection ownership, reports, and audit history.
4. In the registered-user list, click **Edit** for the intended account.
5. In **Edit User Credentials**, update the permitted fields. Leave the password field blank if the current password must be kept.
6. Click the dialog’s save action and verify the success message. Close the dialog when finished.
6. In the edit dialog, click **Save Changes** and verify the success message. Click **Cancel** or the dialog close control when finished.
7. To remove an account, return to the user row and click **Delete**, then complete the confirmation step. You cannot delete your own account.

## Review and manage inspections

**Supported.** The Inspections area lists organization-scoped inspection records and supports filtering by inspector.

1. Click **Inspections**.
2. Open the inspector filter and choose an inspector, or leave it at the all-inspectors option.
3. Review the record identifier, inspector, classification, confidence, location, timestamps, and protocol fields.
4. Click the image preview when an image is available.
5. To remove a record, verify the identifier, click its icon-only delete control, complete the confirmation dialog, and record the reason under local policy.

Deletion is a destructive action. Before confirming a deletion, verify the inspection identifier and obtain any required approval. Do not delete a record to hide an unfavorable result; use the dispute/review workflow where appropriate.

## Review result disputes

**Supported.** The Disputes area shows pending inspection-result disputes. Review the model result, expected result, developer-label state, and submitter. Enter an optional review note when the dispute screen provides the note field and it adds useful context to the audit trail.

1. Click **Disputes**.
2. Open a pending dispute and compare the submitted expected result with the inspection result.
3. If needed, enter the review note in the dispute card.
4. Click **Approve official result** to accept the reviewed result, or click **Reject** to reject the dispute decision.
5. Developers may click **Apply developer label** when the disputed record should become developer ground truth. Verify the label-applied state afterward.

- **Approve official result:** accepts the reviewed official result.
- **Reject:** rejects the dispute decision.
- **Apply developer label:** available to developers when the disputed record should contribute to developer ground-truth workflow.

Use the dispute path for a documented review. Do not change data informally through exports or direct database edits.

## Manage access codes

**Supported.** The Access Codes area creates, lists, toggles, and deletes onboarding codes. Give a code only to the intended recipient or approved enrollment channel. Use a description that identifies the administrative batch without exposing confidential details.

Click **Access Codes**, then use this control sequence:

1. In **Create Access Code**, enter **Code** and **Description**.
2. Click **Generate**.
3. Confirm the new row shows **Active** before distributing the code. Use the copy icon to copy the code only into an approved channel.
4. Use the row’s **OFF**/**ON** control to disable or re-enable it; confirm the status changes to **Disabled** or **Active**.
5. Use the row’s delete control only when retention policy allows and the code is no longer needed.

## Manage market locations

**Supported.** The Markets area maintains the selectable market/location list used during inspections.

1. Click **Markets**.
2. In **Add Market Location**, enter **Market Name**.
3. Click **Add Market**.
4. Confirm the new name appears in **Manage Market Locations** and matches the spelling used in reports and inspector instructions.
5. To remove a location, click its delete control and confirm only after checking historical-report and active-inspection implications.

The market list is a selectable configuration list. Inspectors choose the physical market manually; the system does not replace that choice with the nearest configured market.

## Generate reports

[[FIG:mobile-admin-reports-annotated.png|Figure 19. Mobile Reports export controls|Mobile Generate Reports panel. Green numbered markers identify PDF Summary, CSV Detail, and JSON Snapshot.]]

**Supported.** The Reports area accepts a start and end date and provides three export formats:

| Format | Intended use | Handling |
|---|---|---|
| PDF Summary | Human-readable operational or management review | Store as an approved controlled report |
| CSV Detail | Spreadsheet analysis and data review | Restrict access; contains row-level inspection details |
| JSON Snapshot | System-to-system processing or archival snapshot | Treat as structured sensitive data; validate before reuse |

1. Click **Reports**.
2. Set the **Start Date** and **End Date**. The start date must be on or before the end date.
3. Click one export action: **PDF Summary**, **CSV Detail**, or **JSON Snapshot**.
4. Wait for the progress overlay to finish. Do not click another export while one is running.
5. Verify the downloaded filename and open the file to confirm the selected date range.

The export includes the selected range only. A developer export may include additional model metrics and manual-label fields.

## Review audit logs

**Supported.** The **Logs** tab presents encrypted audit events with event type, key identifier, stored time, actor, source information when available, event ID, and an expandable payload view.

1. Click **Logs**.
2. Enter a known event type, actor, IP, or key ID in the log filters.
3. Open the matching event and click **View Payload** only when the payload is necessary.
4. If you must copy payload JSON, place it only in an approved incident or audit record.

Audit-log entries are evidence and must not be casually edited or deleted.

## Admin operating safeguards

- Use a named administrator account; do not share credentials.
- Confirm role and organization context before opening organization-wide records.
- Use reports and disputes for reviewable changes.
- Never place passwords, tokens, access codes, or secrets in notes or messages.
- When a screen reports an error, preserve the time, role, action, and non-sensitive error text for support.

[[PAGEBREAK]]

# Developer guide

## Supported technical baseline

The supported runtime is Node.js 22.x, within `>=22 <25`, with npm 9 or newer. The repository is an npm workspace containing `frontend` and `backend`.

## Install and configure

From the repository root:

```powershell
npm install
```

Create `backend/.env` from the example and configure at least:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-server-only-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
APP_SESSION_SECRET=use-a-long-random-value
AUDIT_LOG_KEY=64-hex-characters-or-base64-for-32-bytes
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
UPLOAD_DIR=./uploads
```

For password reset email, configure `SMTP_USER` and `SMTP_PASS`. Developer dashboard access requires `DEVELOPER_OPTIONS_PASSWORD`; the token secret and TTL are optional overrides. Keep server-only values out of the frontend.

Create `frontend/.env` with:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Apply every migration in `backend/supabase/migrations/` in filename order. Create the storage buckets and policies defined by the migrations before testing uploads.

## Run and verify locally

Start both services:

```powershell
npm run dev
```

Or start them individually:

```powershell
npm run dev:backend
npm run dev:frontend
```

The documented local URLs are frontend `http://localhost:8080`, backend `http://localhost:3001`, and health check `http://localhost:3001/api/analysis/health`.

Build and check:

```powershell
npm run build
npm run typecheck -w backend
npm run typecheck -w frontend
npm run test:fast
```

The health check should return `{ "status": "ok" }` when the backend is configured and running.

## Architecture and request flow

The frontend is organized as Feature-Sliced Design: `app`, `pages`, `widgets`, `features`, `entities`, and `shared`. The backend is a modular monolith. Each bounded context uses presentation, application, domain, and infrastructure layers.

The normal request path is:

```text
Request
  -> module presentation route
  -> controller
  -> application use case
  -> infrastructure adapter
  -> Supabase / Storage / SMTP
  -> view or shared HTTP response
```

Keep Supabase access in infrastructure adapters. Presentation and application code must use module contracts and must not import Supabase directly. Use explicit projections, bounded reads, deterministic ordering, indexes, and aggregate RPCs where the existing module requires them.

## Route namespaces

| Namespace | Purpose |
|---|---|
| `/api/auth` | Credentials, passkeys, sessions, CSRF, password recovery |
| `/api/analysis` | Health and analysis-related endpoints |
| `/api/upload` | Inspection image upload |
| `/api/profiles` | User profiles and administration |
| `/api/inspections` | Inspection records, statistics, and disputes |
| `/api/access-codes` | Onboarding-code lifecycle |
| `/api/stats` | Landing and aggregate statistics |
| `/api/chat` | Assistant chat |
| `/api/user-chat` | User-to-user messaging |
| `/api/market-locations` | Market-location administration |
| `/api/audit-logs` | Audit-event persistence and reads |
| `/api/developer-options` | Developer options and model/runtime controls |
| `/api/developer-dashboard` | Datasets, exports, disputes, metrics, and training runs |

## Authentication and security model

Supabase Auth verifies credentials or passkey assertions. The backend issues a signed `meatlens_session` application token for cookie-capable clients. Unsafe cookie requests carry a CSRF token and pass origin validation. Native/bearer clients can use an `Authorization: Bearer ...` header.

Cross-cutting middleware applies security headers, CORS/origin policy, rate limits, authentication, upload constraints, and safe error serialization. Session limits track active device slots using hashed tokens; expired slots are pruned. Do not log or expose secrets and do not weaken the auth, CSRF, origin, rate-limit, or upload controls to simplify local testing.

## Developer workspace

[[FIG:mobile-developer-tabs-annotated.png|Figure 20. Mobile Developer workspace tabs|Mobile Developer workspace tabs. Green numbered markers identify the inner Developer Settings, API Docs, Datasets, and Training tabs.]]

**Supported interface; authenticated developer session required.** The Developer tab contains five workspace tabs:

- **Overview:** live in-app model metrics, imported model comparisons, class comparisons, and meat-type accuracy breakdowns.
- **Developer Settings:** select the active analysis model, unlock developer access, change guarded toggles, inspect pending queues, and manage debug utilities.
- **API Docs:** Swagger-style operation catalog with parameters, headers, request body/file fields, response body/headers, cURL output, request history, and destructive-request confirmation.
- **Datasets:** filter inspection records by location, inspector, meat type, classification, date, and image state; apply manual classifications; export bounded datasets.
- **Training:** import and review results from local training runs.

The API Docs workbench excludes auth tokens from browser request history and redacts sensitive headers. A DELETE request requires explicit confirmation. Use the repository route source and integration tests as the authority for operation details.

### Open a developer workspace tab

1. Open **Admin**.
2. Click **Developer Settings** in the admin navigation. If it is missing, the current account is not recognized as a developer.
3. Click one of the inner tabs: **Overview**, **Developer Settings**, **API Docs**, **Datasets**, or **Training**.

### Use Developer Settings

1. Click the inner **Developer Settings** tab.
2. If the panel is locked, enter the developer-options password and select the unlock action.
3. Choose the required model from the model selector only after confirming the model name and intended purpose.
4. Change guarded toggles only for a documented test or maintenance task.
5. Review pending scan/audit counts before using queue tools. If exporting the queue, click **Export Offline Queue JSON** and protect the downloaded file.

### Use API Docs

[[FIG:mobile-developer-api-docs-annotated.png|Figure 21. Mobile API Docs tab|Mobile Developer workspace with API Docs selected. Marker 1 identifies the API Docs tab.]]

1. Click **API Docs**.
2. In the category rail, click the operation you need.
3. Review its method, route, parameters, headers, request body/file fields, and response details.
4. Enter only non-secret test values, then use the request action when the operation is authorized.
5. Review request history only for non-sensitive troubleshooting. DELETE operations require the explicit confirmation step.

### Use Datasets and Training

1. Click **Datasets** and set the available filters for location, inspector, meat type, classification, date, and image state.
2. Review the matching inspection rows before changing a manual classification.
3. Apply a manual classification only when the evidence and dispute/ground-truth basis are documented.
4. Use the dataset export control for a bounded export and wait for the export progress to finish.
5. Click **Training**, choose the local training-run ZIP package using the file control, and start the import.
6. Confirm that the imported run appears in the training list. Importing a run does not automatically replace the active in-app model.

[[FIG:endpoint-index.png|Figure 2. Developer API endpoint index|Repository-provided application screenshot showing the endpoint index used by the API Docs workspace. Authenticated request values are not shown.]]

### Model and ground-truth controls

The developer model selector supports the configured MobileNetV3Small and other documented runtimes, including the Seed123 MobileNetV3Small, legacy MobileNetV3Small, ResNet50, and Ensemble options when available in the current build. The primary model metadata records an addition date of 13 August 2026.

Manual classifications in Datasets act as ground-truth input for live in-app Accuracy, Precision, Recall, and F1 metrics. Apply labels carefully and retain the basis for the label in the related inspection or dispute workflow. Imported training results are artifacts for comparison; they do not automatically replace the active in-app model.

## Deployment and maintenance

The supported deployment separates the Netlify frontend, Render backend, and Supabase managed services. No Redis, Grafana, queue, cache server, or external metrics stack is required by the supported architecture.

Before deployment, verify environment variables, allowed origins, database migrations, storage policies, model assets, upload directory behavior, health checks, and a complete smoke path from sign-in through inspection save. Apply new schema changes as forward-only timestamped migrations; never edit an applied migration.

## Developer troubleshooting

| Problem | Check |
|---|---|
| Backend will not start | Confirm `backend/.env`, Supabase URL/keys, session secret, and valid audit-log key |
| Browser origin/CSRF error | Add the exact frontend origin to `ALLOWED_ORIGINS` and use the credentialed API client |
| Upload failure | Check `UPLOAD_DIR`, storage buckets/policies, multipart field name `image`, and file limits |
| Developer package import fails | Use multipart field `package`, confirm the package format, and inspect the guarded developer route response |
| Model is unavailable | Run the frontend model sync/prewarm path and verify the public model assets are present |
| Reports are slow | Use bounded date ranges and wait for the export progress task; inspect logs before changing infrastructure |
| Tests fail after a module change | Run the smallest failing unit/integration/architecture suite, then the relevant workspace checks |

## Planned / roadmap notes

Project notes may mention future enhancements or design explorations. They are not automatically operational features. Confirm implementation in `frontend/src`, `backend/src`, route registration, and tests before documenting a capability as Supported. This version of the manual therefore avoids promising unverified mobile, production, or account-specific screens.

[[PAGEBREAK]]

# Reference and support

## Frontend route quick reference

| Route | Use | Access |
|---|---|---|
| `/` | Public landing page | Public |
| `/login` | Sign in | Public |
| `/signup` | Create an account | Public; access code required by workflow |
| `/forgot-password` | Request password recovery | Public |
| `/reset-password` | Complete password reset | Recovery link |
| `/onboarding` | Complete profile/onboarding | Authenticated onboarding user |
| `/inspect` | Capture and analyze an inspection | Authenticated user |
| `/history` | Review saved inspection history | Authenticated user |
| `/messages` | User-to-user messaging | Authenticated online session |
| `/profile` | Profile and settings | Authenticated user |
| `/profile/tutorial` | Inspector tutorial | Authenticated user |
| `/profile/help` | Help resources | Authenticated user |
| `/profile/help/scope` | Inspection-scope help | Authenticated user |
| `/admin` | Admin and developer workspace | Admin or developer |

## Escalation checklist

When escalating an issue, provide the role, route/area, action, approximate time, device/browser context, network state, and non-sensitive error text. Do not include passwords, tokens, access codes, raw audit payloads, or personal data unless the approved incident process explicitly requires a protected transfer.

## Glossary

| Term | Meaning |
|---|---|
| Access code | Administrator-issued code used during onboarding |
| Analysis result | Model and protocol output shown after image analysis |
| Confidence | Model-reported confidence score, expressed as a percentage in the interface |
| Ground truth | Manual classification used to compare model output with an expected label |
| Inspection scope | The records a user or administrator is permitted to view |
| ONNX | Model format used for local browser inference |
| Pre-scan protocol | Required checklist and context entered before image analysis |
| Session cookie | Signed application session transport for browser clients |
| Source-verified interface | UI documented from tracked source but not opened in the local capture session |

## Document control

| Field | Value |
|---|---|
| Title | MeatLens User Manual |
| Version | 1.1 |
| Status | Approved for production |
| Effective date | 31 August 2026 |
| Owner | MeatLens project team |
| Source of truth | Current tracked frontend/backend source and `documentation/` |
| Review trigger | Material UI, role, route, model, security, deployment, or policy change |

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 29 August 2026 | Initial official manual covering inspectors/users, administrators, and developers |
| 1.1 | 31 August 2026 | Expanded click-by-click procedures, corrected current control labels, clarified non-pork records and manual market selection, and documented the link-based password reset flow |
