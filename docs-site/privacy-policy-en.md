---
title: Privacy Policy
permalink: /privacy-policy-en/
---

# Privacy Policy — Rainbow Sketchbook

**Last Updated**: 2026-05-23
**Applies To**: Rainbow Sketchbook — Android App (`com.rainbow.sketchbook`)

---

## 1. Overview

Rainbow Sketchbook (the "App") is a mobile coloring and drawing game designed for children aged 5 and up. The App prioritizes child user safety and privacy above all else.

This Policy complies with the **Children's Online Privacy Protection Act (COPPA)** of the United States, **Article 8 of the EU General Data Protection Regulation (GDPR)** regarding children's data, **South Korea's Personal Information Protection Act**, and the **Google Play Families Policy**.

## 2. Personal Information We Collect

**The App does not collect any personally identifiable information.**
We collect **anonymous usage analytics only** to improve service quality (see Section 7).

| Item | Collected? | Notes |
|---|---|---|
| Name, email, phone | ❌ Not collected | No user registration |
| Location (GPS) | ❌ Not collected | Location permission not requested |
| Contacts, photos, microphone | ❌ Not collected | These permissions are not requested |
| Advertising ID (AAID/IDFA) | ❌ Not collected | Explicitly denied in AndroidManifest |
| Crash reports | ❌ Not collected | No Crashlytics |
| Device identifiers (IMEI/MAC) | ❌ Not collected | |
| IP address (server-stored) | ❌ Not collected | No backend server |
| **Anonymous usage analytics (Firebase Analytics)** | ✅ **Collected anonymously** | Kids mode (no AAID, no ad targeting) — see Section 7 |

## 3. Data Storage

All data (your child's artwork, progress, unlock status, etc.) is stored **only on the user's device**. Nothing is transmitted to external servers.

- Storage location: Android app-private storage (`/data/data/com.rainbow.sketchbook/`)
- Storage method: Local key-value (Capacitor Preferences / localStorage)
- External transmission: **None**

## 4. In-App Purchases

The App offers a single one-time in-app purchase: "Starlight Artist Pack" (~$1.99 USD equivalent).

- Payments are processed exclusively through **Google Play Billing**.
- Payment details (card number, billing address) are handled directly by Google. **The App never accesses payment information.**
- Receipts are used only to unlock content locally; nothing is transmitted externally.

For more, see Google's privacy policy: <https://policies.google.com/privacy>

## 5. Children's Privacy

The App is designed primarily for children under 13 (ages 5+). The App does not knowingly collect any personal information from children.

If a parent or guardian believes that the App has inadvertently collected a child's personal information, please contact us using the information below. We will promptly delete any such information.

## 6. Sharing With Third Parties

Since the App collects no personal information, there is nothing to share with third parties.

Exceptions:
- Lawful requests under applicable law
- Receipt verification with Google (limited to Google Play Billing)

## 7. Third-Party Libraries

| Library | Purpose | Collects Data? |
|---|---|---|
| Phaser 3 | Game engine | ❌ No |
| Capacitor | Native wrapper | ❌ No |
| Google Play Billing | Payment processing | Google policy applies |
| **Firebase Analytics** | Anonymous usage stats | ✅ Kids mode (details below) |

### Firebase Analytics — Kids Mode

To improve our service, we collect **anonymous** data only:
- App launches, session duration, screen views
- Behavior events: template selection, coloring/drawing completion (no personal identifiers)
- Purchase events (amount only, no card information)
- Gallery save/share usage frequency

We do **NOT** collect:
- Advertising ID (AAID): explicitly denied in AndroidManifest
- Personalized ad targeting: disabled in Firebase Console
- User identification: only anonymous Firebase Installations ID
- Location data: not collected

**No advertising is shown.** Firebase data is used solely to improve the App and is never shared with third-party ad networks.

Data retention: **2 months** (minimum Firebase Console setting)

## 7-1. User Artwork Sharing (Optional)

Users may use their artwork in two ways:
- **Save to phone gallery**: The App creates its own album ("Rainbow Sketchbook") and saves PNG locally (no external transmission)
- **Share to other apps**: Via system share sheet (e.g., messaging apps, email) — explicit user choice with **parent verification required**

When sharing:
- Only the artwork PNG file is transmitted (no personal data)
- A **parent verification step** (simple math problem) prevents accidental sharing by children

## 8. User Rights

Because the App collects no personal information, there is no separate procedure for access/correction/deletion. However:

- Uninstalling the App deletes all on-device data.
- Payment refunds follow Google Play policy and should be requested through the Play Store.

## 9. Policy Changes

If this Policy changes, we will notify users with the next App update and in-app notification for significant changes.

## 10. Contact

For questions about this Policy or our data practices, please contact:

- **Email**: bloombee.apps@gmail.com
- **Response time**: Within 7 business days

---

**Note**: This Policy is provided in Korean and English. In case of discrepancy, the Korean version prevails.
