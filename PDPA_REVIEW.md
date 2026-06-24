# SKKJ Autopart — PDPA / Privacy Policy Review
**Prepared:** June 2026
**Status:** DRAFT — requires review by a qualified Thai PDPA professional before publishing

---

## 1. What the site was saying before (and why it was wrong)

**Cookie banner (before):**
> "This site uses cookies to improve your experience and comply with Thailand's PDPA data protection law."

**Problems:**
- The site primarily uses `localStorage` (browser storage), not traditional HTTP cookies.
- The statement implies compliance but provides no information about what is collected, why, or who receives it.
- The policy page had zero privacy or PDPA content — only returns, warranty, payment, shipping, and exchange rules.

---

## 2. What the site actually does with personal data

### 2a. Data collected and where it goes

| Data | What it contains | Where it's stored | When collected |
|------|-----------------|-------------------|----------------|
| Order data | Name, phone, delivery address, car year, payment notes | Supabase (Japan, ap-northeast-1) | When customer places any order |
| Payment slips | Bank transfer slip images (base64), name, phone, address, price | Supabase (`skkj_slips` table) | When bank transfer order is submitted |
| Customer account | Email, name, phone, password (hashed by Supabase Auth) | Supabase Auth + `skkj_customers` table | When customer registers |
| Address history | Name, phone, saved delivery addresses | Supabase `skkj_customer_addresses` | When logged-in customer places order |
| Product reviews | Name, review text, star rating | Supabase `skkj_reviews` table | When customer submits a review |
| Order alert emails | Name, phone, product, price, payment method | Sent via Resend (US-based email service) to business inbox | When any order is placed |
| Google Sheets (optional) | Full order data including name, phone, address | Google Sheets via admin-configured Google Apps Script | When any order is placed (if feature is enabled) |
| Visit analytics | Page views, product views, search terms, visitor ID, customer ID | Browser localStorage only — NOT sent to any server | After user accepts cookie consent |
| Restock alerts | Product ID, date of request (NO contact details) | Browser localStorage only | When customer requests restock notification |
| Recently viewed | Product IDs only | Browser localStorage only | After user accepts cookie consent |

### 2b. Third-party data processors

| Processor | Country | What they receive | Legal basis |
|-----------|---------|-------------------|-------------|
| Supabase | Japan | Orders, customer accounts, slips, reviews | Contractual necessity |
| Resend | United States | Order alert: name, phone, product, price | Contractual necessity (business operations) |
| Google (Sheets) | United States | Full order data (if feature enabled by admin) | Contractual necessity (business reporting) |

**Note on international transfers:** Thailand's PDPA requires that personal data transferred outside Thailand goes to a country with adequate protection, or that appropriate safeguards are in place. Supabase (Japan), Resend (US), and Google (US) should each have a data processing agreement or equivalent in place. This needs legal confirmation.

---

## 3. What was fixed (technical — already shipped)

These were data minimisation violations found during technical review:

1. **Analytics events** previously stored `customerName` and `customerPhone` in `localStorage` — these fields have been removed. Analytics now stores only `customerId` (an opaque ID) alongside event data.

2. **Restock notification cache** previously stored customer contact details in `localStorage` — this has been removed. The cache now stores only `brandId`, `modelId`, and `date`.

Both of these were browser-local storage issues — the data was not exposed to other users or third parties, but it violated the PDPA principle of data minimisation (collecting only what is necessary).

---

## 4. What was changed in the policy (content — already shipped)

### Added to the FAQ / Policy page (คำถาม/นโยบาย)

Three new accordion sections were added in both Thai and English:

1. **Privacy Policy / นโยบายความเป็นส่วนตัว** — identifies SKKJ Autopart as data controller, names third-party processors (Supabase/Resend/Google Sheets), states data is not sold.

2. **What data we collect / ข้อมูลที่เรารวบรวม** — lists each category of data and where it is stored.

3. **Your data rights (PDPA) / สิทธิ์ของคุณ (PDPA)** — explains right to access, correct, delete, transfer, and withdraw consent. Gives contact (LINE @skkjautopart, email skkjthailand@gmail.com) and links to PDPC (www.pdpc.or.th).

### Cookie banner text updated

- **Before (EN):** "This site uses cookies to improve your experience and comply with Thailand's PDPA data protection law."
- **After (EN):** "This site uses browser storage for visit analytics and recently viewed products. Order data is collected to process purchases. See our Privacy Policy (FAQ / Policy page) for full details."

---

## 5. What still needs professional review

This document was prepared by a technical reviewer, not a Thai PDPA lawyer. The following questions need qualified legal opinion before the policy is published:

### 5a. Is the written policy sufficient under PDPA?

PDPA Section 23 requires a privacy notice to include:
- Purpose of processing (covered in new policy)
- Types of personal data (covered)
- Retention period — **NOT currently specified. A lawyer should advise on retention periods for orders, slips, accounts.**
- Identity and contact of data controller — **Partially covered. A formal registered business address may be required.**
- Rights of data subjects (covered)
- Cross-border transfer details (covered in summary; may need more detail)

### 5b. Does the prior localStorage issue require notification?

Between the site launch and the technical fixes shipped in June 2026, analytics events stored `customerName` and `customerPhone` in browser localStorage alongside event data, and restock alert cache stored customer contact info.

The key question: does this constitute a "personal data breach" requiring notification to the PDPC under PDPA Section 37?

**Factors in favour of no notification required:**
- localStorage is browser-local — data was not accessible to other users or third parties
- No evidence of actual exposure or access by unauthorised parties
- The data was functionally unnecessary (analytics can work without name/phone) — a minimisation issue, not an access breach

**Factors a lawyer needs to assess:**
- Whether the PDPA definition of "breach" covers internal data minimisation violations even without external exposure
- Whether the period of exposure was long enough to trigger notification obligations
- Whether affected customers need to be individually notified

**Recommendation:** Consult a Thai PDPA specialist (or a firm specialising in Thai data protection law) before concluding no notification is required.

### 5c. Google Sheets and legal basis

If Google Sheets reporting is enabled, full order data (name, phone, address) is sent to a Google-hosted spreadsheet. Confirm:
- Whether a data processing agreement with Google is in place (Google Workspace DPA is standard; check if the account has this)
- Whether this is disclosed adequately (currently described in the new policy as "business reporting")

### 5d. Consent vs. legitimate interest for order data

Order data (name, phone, address) is processed on the basis of contractual necessity (PDPA Section 24(3)), not consent — because you cannot complete a purchase without it. The current consent banner asks for "accept/decline" which could be misread as optional. The banner text should make clear that order-related data is collected regardless of the analytics consent choice.

**Suggested addition to cookie banner or policy:** "Declining this notice blocks analytics tracking only. Order data and account data are processed as necessary to complete your purchase, regardless of this setting."

---

## 6. Contacts and resources

- **Thai PDPC (complaint/guidance):** www.pdpc.or.th, 02-142-1033
- **Supabase DPA:** https://supabase.com/privacy (review for B2B data processing terms)
- **Resend privacy:** https://resend.com/legal/privacy-policy
- **Google Workspace DPA:** Available in Google Admin console under Account > Legal > Data Processing Amendment

---

*This document is for internal review only. Do not publish until reviewed by a qualified Thai PDPA professional.*
