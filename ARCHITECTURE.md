# Legal CRM: Case and Matter Management Blueprint

Pakistan first, global ready. Version 1.0, 12 November 2026.

**Stack assumed:** Next.js (App Router), NestJS, Prisma, PostgreSQL, S3 compatible object storage, Redis with BullMQ.

**Tags:** MVP, V2 and V3 mark the delivery phase. VERIFY marks a legal rule that counsel must confirm before it ships as a default.

**Contents:** 1 Scope. 2 Pakistani legal context. 3 Global benchmark. 4 Architecture. 5 Data model and Prisma schema. 6 Reference data and rules. 7 Core flows. 8 Finance design. 9 API design. 10 Frontend specification. 11 Security and compliance. 12 Notifications. 13 AI features. 14 Reporting. 15 Delivery plan. 16 Gap checklist. 17 Glossary and sources.

## 1. Product scope

### 1.1 Vision

A matter centric practice system for law firms and chambers. Every fact about a dispute or engagement (people, forums, hearings, documents, deadlines, money) hangs off one matter and is reachable in two taps. Pakistan first means bilingual (English and Urdu), court calendar driven, friendly to cash and bank payments, and tolerant of poor connectivity in courtrooms.

### 1.2 Personas

| Persona | Primary jobs | Key screens |
| --- | --- | --- |
| Partner or principal | Oversee matters, approve fees and write offs, review outcomes | Dashboard, Matter overview, Finance |
| Associate advocate | Prepare briefs, appear, draft, record outcomes | Today board, Hearing capture, Documents |
| Junior or intern | Research, drafting support, filing runs | Tasks, Documents |
| Clerk (munshi) | Track cause lists, certified copies, receipts, expenses | Cause list inbox, Expenses, Calendar |
| Accountant | Invoices, client money, reconciliation | Finance |
| Client | See status, hearing dates, documents, dues | Client portal (V2) |
| Firm admin | Users, templates, rules, imports | Settings |

### 1.3 Goals and non goals

Goals:

1. No missed hearing or limitation date.
2. One tap next date capture after every hearing.
3. Versioned, tamper evident documents.
4. Clean separation of client money, fees and expenses.
5. Outcome data usable for analytics and for appeal decisions.

Non goals for MVP: eFiling into courts (no uniform public API exists), replacing full accounting software, judge outcome prediction, a public legal research database.

### 1.4 Design principles

1. The matter is the spine. Proceedings carry forum specifics.
2. Hearing centric UX. The calendar is generated from hearings, deadlines and tasks.
3. Rules are data (limitation, stages, fees, tax). They are effective dated and versioned.
4. Append only for money, audit and document versions.
5. Suggest, never silently decide. Computed legal dates need lawyer confirmation.
6. Bilingual by default and RTL safe.
7. Mobile first and offline tolerant for hearing capture.
8. Least privilege with matter level access control.
9. Every automation has a manual fallback. Cause list scrapers will break.

### 1.5 Module map

| Module | Scope | Phase |
| --- | --- | --- |
| Identity and tenancy | Auth, roles, offices, audit | MVP |
| CRM | Contacts, organizations, relations, leads, KYC | MVP |
| Conflicts | Search and decision log | MVP |
| Matters | Matter, team, parties, engagement, vakalatnama | MVP |
| Proceedings | Multi forum cases, stages, linking | MVP |
| Hearings and calendar | Hearings, cause list inbox, reminders, clash detection | MVP |
| Deadlines | Limitation rules engine, certified copy tracker | Manual deadlines MVP, engine V2 |
| Tasks | Stage templates, assignments | MVP |
| Documents | Versions, templates, exhibits, sharing, OCR, compare | Versions MVP, OCR and compare V2 |
| Finance | Fee arrangements, expenses, invoices, client money, reconciliation | Basic MVP, full V2 |
| Communications | Logs, WhatsApp, SMS, email | SMS and email MVP, WhatsApp V2 |
| Client portal | Status, documents, payments | V2 |
| Reports | Dashboards, outcome analytics | V2 |
| AI assist | Summaries, voice notes, drafting | V3 |

## 2. Pakistani legal context

### 2.1 Forum map

| Forum family | Examples | Why it matters to the model |
| --- | --- | --- |
| Supreme Court | Principal seat and branch registries | Petitions for leave, appeals, constitutional matters. Own case information system |
| Federal Shariat Court | Islamabad | Distinct jurisdiction |
| High Courts | Lahore, Sindh, Peshawar, Balochistan, Islamabad, with benches and circuit benches | Original and appellate sides. Each runs its own cause list system |
| District and sessions courts | District judge, additional sessions judge, senior civil judge, civil judge, magistrate | Largest volume, civil and criminal |
| Special courts | Banking, anti terrorism, accountability, customs and tax, consumer, anti corruption | Statute specific procedure |
| Family and rent | Family court, rent controller | Short statutory timelines |
| Revenue | Collector, commissioner, Board of Revenue | Land records and mutation |
| Tribunals | Inland revenue appellate tribunal, service tribunals, labour courts, NIRC | Forum depends on the statute |
| ADR | Arbitration, mediation | Matters without a court |

### 2.2 Case number patterns

| Pattern | Example | Stored as |
| --- | --- | --- |
| Civil suit | Civil Suit No. 123 of 2025 | caseType CIVIL\_SUIT, number 123, year 2025 |
| Writ petition | W.P. No. 4567 of 2025 | caseType WRIT\_PETITION |
| Criminal miscellaneous (bail) | Crl. Misc. No. 890 of 2025 | caseType CRL\_MISC\_BAIL |
| FIR | FIR No. 214 of 2025, PS Civil Lines, sections 302 and 34 PPC | firNumber, policeStation, sections\[\] |
| Appeal or revision | R.F.A. No. 12 of 2025, Civil Revision No. 40 of 2025 | by caseType |
| Petition for leave | C.P.L.A. No. 345 of 2025 | caseType CPLA |

Always keep rawCaseNumber next to the parsed fields. Courts and clerks write them differently.

### 2.3 Procedure stage templates

| Procedure | Stages |
| --- | --- |
| Civil suit | Pre suit notice, Plaint filed, Summons served, Written statement, Replication, Issues framed, Plaintiff evidence, Defendant evidence, Final arguments, Judgment, Decree, Execution |
| Criminal trial | FIR registered, Investigation, Challan submitted, Bail, Cognizance, Charge framed, Prosecution evidence, Statement of accused, Defence evidence, Final arguments, Verdict, Appeal |
| Bail application | Filed, Notice to prosecution, Arguments, Order |
| Writ petition | Drafted, Filed, Notice issued, Comments filed, Rejoinder, Hearing, Order |
| Family suit | Filing, Pre trial reconciliation, Written statement, Issues, Evidence, Arguments, Decree |
| Rent | Ejectment petition, Reply, Tentative rent order, Evidence, Order |
| Bank recovery | Suit, Leave to defend, Evidence, Decree, Execution |
| Tax tribunal | Appeal filed, Notice, Hearing, Order |
| Appeal or revision | Memo drafted, Filed, Notice, Hearing, Judgment |
| Execution | Application, Warrants, Attachment, Auction, Satisfaction |

Stages are data (StageTemplate) and editable per tenant.

### 2.4 Concepts the model must carry

- **Vakalatnama:** the advocate's authority to appear. Track execution date, signatory, scope, replacement and withdrawal.
- **Certified copy:** applied, ready and received dates. These dates feed limitation.
- **Cause list:** the daily list of cases per bench with serial numbers. Cases can be not reached.
- **Adjournment:** next date, reason, who asked for it.
- **Ex parte, dismissal in default, restoration:** each starts a short clock.
- **Interim orders:** stays and injunctions with expiry or review dates.
- **Notice before suing the government (Section 80 CPC)** and similar statutory notices.
- **Court fee and stamp duty** by claim value and province.
- **Attestation:** oath commissioner, notary, affidavit.
- **Hijri dates** are common in family and inheritance papers. Store an optional Hijri date next to the Gregorian one.
- **Fee practice:** per appearance, per stage, lump sum, monthly retainer.
- **Fee sharing** only with another advocate (VERIFY Rule 141).

### 2.5 Regulatory and compliance notes (VERIFY with counsel)

- **Conduct:** the Pakistan Legal Practitioners and Bar Councils Rules 1976, Chapter XII (Rules 134 to 175B), set professional conduct. Rules 149 and 150 touch client property and money. Treat client money as segregated.
- **Electronic evidence:** the Electronic Transactions Ordinance 2002 added explanations to Article 73 of the Qanun e Shahadat Order 1984, so electronic documents and printouts can be primary evidence. Store hash, timestamp and source for every file.
- **Data protection:** no dedicated statute was found, and reporting in March 2025 showed the Personal Data Protection Bill still delayed. Build to GDPR style principles and check status before launch.
- **Tax:** sales tax on services is provincial (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan), with FBR covering Islamabad. Applicability to legal services is contested and rates move with budgets. Model tax as effective dated configuration, default off.
- **Withholding:** clients may deduct withholding income tax from fees. Record certificates.
- **AML and KYC:** confirm whether advocates fall under current rules. Ship an optional KYC checklist.
- **Court data sources:** each High Court runs its own system and the Supreme Court runs its own case information system. No unified API exists. Plan per court adapters plus manual fallback, and respect each site's terms of use.

## 3. Global benchmark

| Capability | What leading products do | Our stance |
| --- | --- | --- |
| Intake and conflicts | Search clients, parties, relatives and affiliates. Log the decision | MVP, add relationship graph in V2 |
| Deadline rules | Court rules based calendaring with rule versioning | V2, Pakistani rules seeded and counsel verified |
| Document management | Version history, check out, compare, email filing, retention | Versions MVP. Compare and email filing V2 |
| Trust accounting | Per client ledgers, three way reconciliation, overdraft block | Ledger MVP, reconciliation V2 |
| Billing | Time and fixed fee, LEDES for corporate clients, approvals | Fixed, per appearance, retainer. LEDES optional V3 |
| Client portal | Secure messaging, documents, payments | V2 |
| Analytics | Profitability, realization, aging | V2 |
| Audit | Immutable logs | MVP |

## 4. Architecture

### 4.1 Logical architecture

- **Web app:** Next.js. Server components for shells and lists. Client components for boards and forms. TanStack Query for data. PWA shell for offline hearing capture.
- **API:** NestJS modular monolith. REST with OpenAPI. Domain events with an outbox table.
- **Database:** PostgreSQL, one schema, tenantId on every row, row level security.
- **Object storage:** S3 compatible bucket with versioning, server side encryption, private only, signed URLs.
- **Queue:** Redis with BullMQ for OCR, cause list sync, reminders, report builds, exports.
- **Search:** Postgres full text and trigram first. Move to Meilisearch or OpenSearch when Urdu relevance needs it.
- **Notifications:** WhatsApp Business API, SMS gateway, email, web push.
- **AI services:** isolated module behind a feature flag (section 13).

Start as a modular monolith. Run job workers as a separate process from day one.

### 4.2 Backend modules

| Module | Responsibility | Key events |
| --- | --- | --- |
| Auth | Login, refresh rotation, 2FA, sessions | user.loggedIn |
| Tenancy | Tenant, offices, plans, settings | tenant.updated |
| UsersAccess | Users, roles, permissions, matter ACL | access.changed |
| Contacts | People, organizations, relations, KYC | contact.created |
| Conflicts | Search and decisions | conflict.decided |
| Matters | Lifecycle, team, parties, vakalatnama | matter.opened, matter.closed |
| Proceedings | Cases per forum, stages, links | proceeding.created, stage.changed |
| Hearings | Hearing records, appearances, orders | hearing.recorded, order.recorded |
| CauseList | Adapters, inbox, matching | causelist.imported |
| Deadlines | Rules, computation, certified copies | deadline.created, deadline.due |
| Tasks | Tasks and templates | task.assigned |
| Documents | Folders, versions, templates, exhibits, sharing | document.versioned, document.filed |
| Finance | Fee terms, expenses, journal, invoices, reconciliation | journal.posted, invoice.issued |
| Comms | Communication log and channels | message.received |
| Notifications | Rules, delivery, preferences | notification.sent |
| Reports | KPIs and exports | report.ready |
| Audit | Append only log | none |
| Files | Upload, scan, storage keys | file.scanned |

### 4.3 Cross cutting patterns

- Guards in order: JwtAuthGuard, TenantGuard, PermissionGuard, MatterAccessGuard.
- Interceptors: AuditInterceptor writes AuditLog. IdempotencyInterceptor reads an Idempotency Key header on money and filing endpoints.
- A Prisma client extension opens a transaction per request and runs set\_config for app.tenant\_id and app.user\_id.
- Soft delete (deletedAt) on business entities. Never on journal lines, audit rows or document versions.
- Optimistic concurrency with a version Int on Matter, Proceeding, Hearing and Document.
- Time: UTC timestamps. Court dates use the DATE type and display in Asia/Karachi.
- Money: Decimal(18,2), never float, currency code on every row.
- IDs: UUID, version 7 where the library allows.

### 4.4 Multitenancy and row level security

Each tenant is a firm. Offices belong to a tenant. A user belongs to one tenant in MVP. Consultants with multi tenant membership arrive in V2.

```sql
ALTER TABLE "Matter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Matter" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Matter"
  USING ("tenantId" = current_setting('app.tenant_id')::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id')::uuid);
```

Apply the same policy to every table that has tenantId. The application role must not own the tables and must not have BYPASSRLS. Add a test that fails the build if any table with tenantId lacks a policy.

### 4.5 Document storage pipeline

1. Client asks the API for a presigned upload URL and sends metadata.
2. Browser uploads straight to the bucket under tenant/matter/document/version.
3. A confirm call creates the DocumentVersion with size and mime type.
4. Worker steps: virus scan, SHA 256 hash (streamed), thumbnail, text extraction (PDF text layer, else OCR in English and Urdu), search indexing.
5. Version becomes READY. Search and AI indexes update.
6. Downloads use short lived signed URLs, are written to AuditLog, and can be watermarked for client copies.

### 4.6 Background jobs

| Job | Trigger | Notes |
| --- | --- | --- |
| causeList.sync | Morning and evening per forum | Adapter with retries and parser tests |
| reminder.dispatch | Every minute | Sends due reminders |
| deadline.recompute | Holiday or rule change | Recomputes open deadlines and flags changes |
| ocr.process | On upload | Backoff retries |
| search.index | On change | Batched |
| report.build | Nightly | Refresh materialized views |
| retention.sweep | Weekly | Flags files past retention |
| reconcile.remind | Monthly | Prompts the accountant |
| backup.verify | Daily | Restores a sample |

### 4.7 Integrations

| Integration | Use | Phase |
| --- | --- | --- |
| Court case status and cause list portals | Adapters per court with manual paste fallback | MVP for two courts, more in V2 |
| WhatsApp Business API | Reminders to lawyers and clients, inbound logging | V2 |
| SMS gateway (local aggregator) | Hearing reminders and OTP | MVP |
| Email | Notices, invoices, inbound filing through a forwarding address | Outbound MVP, inbound V2 |
| eSignature | Engagement letters and other documents where acceptable | V3 |
| Payments | Bank transfer reference matching, Raast, wallets | V2 |
| Accounting export | CSV and journal export | V2 |
| Calendar | ICS feed, Google and Outlook sync | V2 |

### 4.8 Security architecture (details in section 11)

- JWT access tokens with short life and refresh token rotation with reuse detection. Device session list.
- TOTP 2FA, mandatory for partners and finance roles.
- Role based access control with permissions such as matter.read, hearing.write, finance.post, finance.approve, document.download. Roles are permission bundles.
- Matter ACL: confidential matters are limited to team members. Admins see metadata only unless granted.
- Encryption: TLS everywhere, storage encryption, application level encryption for CNIC and bank numbers with a key per tenant.
- Audit every write and every read of confidential documents.

### 4.9 Environments and operations

Dev, staging, production. Infrastructure as code. Daily encrypted backups with point in time recovery and a quarterly restore drill. Structured logs, request ids, metrics, error tracking. Pick a cloud region close to Pakistani users and offer in country hosting for firms that require it. Feature flags per tenant.

## 5. Data model and Prisma schema

### 5.1 Conventions

- Every model also carries createdAt and updatedAt. Mutable business models add deletedAt and a version Int. They are omitted from the listings except where they matter.
- Every tenant owned table has tenantId with an index and a row level security policy. Global seed tables (Forum, CaseType, StageTemplate, OutcomeType, AdjournmentReason, LimitationRule, Holiday, DocumentTemplate, NotificationTemplate) allow tenantId null, and their policies also allow reading null rows.
- Child side relations are shown. Run prisma format to add the inverse fields.
- Court dates use @db.Date. Money uses @db.Decimal(18, 2). Extensible vocabularies (forum kind, document category, expense category) are strings validated against the reference tables in section 6.
- Prisma 7 with the pg driver adapter.

### 5.2 Relationship summary

- Tenant has many Offices, Users, Contacts and Matters.
- Matter has many Proceedings, Parties, Team members, Tasks, Documents, Expenses, Invoices, Fee arrangements and Communications.
- Proceeding has many Hearings, Orders, Certified copies, Exhibits, Witnesses, Deadlines, Vakalatnamas and Stage history. It may have a parent proceeding (an appeal arising from a suit) and links to related proceedings.
- Hearing has many Appearances and at most one next Hearing.
- Order may carry an OutcomeType and an interim expiry date.
- Document has many DocumentVersions and one current version.
- JournalEntry has many JournalLines. Invoice has many InvoiceLines and many PaymentAllocations.

### 5.3 Core enums

```prisma
enum UserRole {
  OWNER
  PARTNER
  ASSOCIATE
  JUNIOR
  CLERK
  ACCOUNTANT
  ADMIN
  CLIENT
}

enum MatterType {
  LITIGATION
  ADVISORY
  TRANSACTIONAL
  ARBITRATION
  REGULATORY
}

enum MatterStatus {
  LEAD
  CONFLICT_CHECK
  ENGAGED
  OPEN
  ON_HOLD
  CLOSED
  ARCHIVED
}

enum Confidentiality {
  NORMAL
  RESTRICTED
}

enum ProceedingStatus {
  ACTIVE
  STAYED
  RESERVED
  DISPOSED
  WITHDRAWN
  ABATED
}

enum HearingStatus {
  SCHEDULED
  HELD
  ADJOURNED
  NOT_REACHED
  CANCELLED
  RESERVED
  DISPOSED
}

enum OrderKind {
  INTERIM
  FINAL
  JUDGMENT
  DECREE
  OTHER
}

enum Channel {
  SMS
  WHATSAPP
  EMAIL
  PUSH
  CALL
  IN_PERSON
  PORTAL
}
```

### 5.4 Tenancy, identity, audit

```prisma
model Tenant {
  id              String   @id @default(uuid()) @db.Uuid
  name            String
  nameUrdu        String?
  plan            String   @default("starter")
  defaultCurrency String   @default("PKR")
  timezone        String   @default("Asia/Karachi")
  settings        Json     @default("{}")
  createdAt       DateTime @default(now())
}

model Office {
  id       String  @id @default(uuid()) @db.Uuid
  tenantId String  @db.Uuid
  name     String
  city     String?
  province String?
  address  String?
  @@index([tenantId])
}

model User {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  officeId      String?   @db.Uuid
  contactId     String?   @db.Uuid   // set for client portal users
  email         String
  phone         String?
  passwordHash  String
  name          String
  nameUrdu      String?
  role          UserRole
  permissions   String[]             // extra grants beyond the role
  barEnrolment  String?              // advocate enrolment number
  courtLevel    String?              // LOWER, HIGH_COURT, SUPREME
  totpSecretEnc String?
  locale        String    @default("en")
  isActive      Boolean   @default(true)
  lastLoginAt   DateTime?
  @@unique([tenantId, email])
}

model Session {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  userId       String    @db.Uuid
  family       String    @db.Uuid   // rotation family for reuse detection
  tokenHash    String    @unique
  userAgent    String?
  ip           String?
  expiresAt    DateTime
  revokedAt    DateTime?
  replacedById String?   @db.Uuid
  createdAt    DateTime  @default(now())
  @@index([userId, family])
}

model MatterAccess {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String @db.Uuid
  matterId    String @db.Uuid
  userId      String @db.Uuid
  level       String            // READ, WRITE, MANAGE
  grantedById String @db.Uuid
  @@unique([matterId, userId])
}

model AuditLog {
  id        BigInt   @id @default(autoincrement())
  tenantId  String   @db.Uuid
  actorId   String?  @db.Uuid
  action    String             // create, update, delete, view, download, login
  entity    String
  entityId  String?
  before    Json?
  after     Json?
  ip        String?
  userAgent String?
  at        DateTime @default(now())
  @@index([tenantId, entity, entityId])
  @@index([tenantId, at])
}

model OutboxEvent {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  type        String
  payload     Json
  createdAt   DateTime  @default(now())
  processedAt DateTime?
  @@index([processedAt, createdAt])
}
```

Partition AuditLog by month with raw SQL. Revoke UPDATE and DELETE on AuditLog from the application role.

### 5.5 CRM, leads, conflicts

```prisma
model Contact {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  kind        String   // PERSON, ORGANIZATION, GOVERNMENT
  fullName    String
  fullNameUrdu String?
  parentName  String?  // father or husband name, used in Pakistani party descriptions
  cnicEnc     String?  // encrypted CNIC
  cnicHash    String?  // keyed hash for exact match and conflict search
  ntn         String?
  phones      String[]
  emails      String[]
  address     String?
  city        String?
  province    String?
  country     String   @default("PK")
  dob         DateTime? @db.Date
  kycStatus   String   @default("NONE")  // NONE, PENDING, VERIFIED, FAILED
  tags        String[]
  isClient    Boolean  @default(false)
  notes       String?
  @@index([tenantId, fullName])
  @@index([tenantId, cnicHash])
}

model ContactRelation {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  fromId   String @db.Uuid
  toId     String @db.Uuid
  kind     String // SPOUSE, PARENT, CHILD, SIBLING, DIRECTOR_OF, SHAREHOLDER_OF, EMPLOYER_OF, PARTNER_OF, AGENT_OF, SAME_AS
  note     String?
  @@unique([fromId, toId, kind])
}

model Lead {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  contactId    String?  @db.Uuid
  summary      String
  source       String?  // REFERRAL, WALK_IN, WEBSITE, WHATSAPP, REPEAT_CLIENT
  referrerId   String?  @db.Uuid
  status       String   @default("NEW") // NEW, IN_CONFLICT_CHECK, QUOTED, WON, LOST
  assignedToId String?  @db.Uuid
  matterId     String?  @db.Uuid        // set when converted
  createdAt    DateTime @default(now())
}

model ConflictCheck {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  leadId      String?   @db.Uuid
  matterId    String?   @db.Uuid
  queryTerms  Json      // names, CNICs, phones, organizations searched
  hits        Json      // matched contacts, matters, relations with reasons
  decision    String    // CLEAR, WAIVED, DECLINED
  decidedById String?   @db.Uuid
  decidedAt   DateTime?
  note        String?
  createdAt   DateTime  @default(now())
}
```

### 5.6 Matters and engagement

```prisma
model Matter {
  id              String          @id @default(uuid()) @db.Uuid
  tenantId        String          @db.Uuid
  number          String          // firm numbering, for example 2026/LIT/0142
  title           String
  titleUrdu       String?
  type            MatterType
  practiceArea    String          // CIVIL, CRIMINAL, FAMILY, CORPORATE, BANKING, TAX, PROPERTY, LABOUR, IP
  status          MatterStatus    @default(OPEN)
  confidentiality Confidentiality @default(NORMAL)
  clientId        String          @db.Uuid
  leadId          String?         @db.Uuid
  leadPartnerId   String          @db.Uuid
  officeId        String?         @db.Uuid
  openedOn        DateTime        @db.Date
  closedOn        DateTime?       @db.Date
  closureReason   String?         // COMPLETED, WITHDRAWN, TRANSFERRED, NONPAYMENT, CLIENT_REQUEST
  claimValue      Decimal?        @db.Decimal(18, 2)
  currency        String          @default("PKR")
  description     String?
  tags            String[]
  retentionUntil  DateTime?       @db.Date
  version         Int             @default(1)
  deletedAt       DateTime?
  client          Contact         @relation(fields: [clientId], references: [id])
  leadPartner     User            @relation(fields: [leadPartnerId], references: [id])
  @@unique([tenantId, number])
  @@index([tenantId, status])
  @@index([tenantId, clientId])
}

model MatterTeam {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  matterId String @db.Uuid
  userId   String @db.Uuid
  role     String // LEAD, ASSOCIATE, JUNIOR, CLERK
  matter   Matter @relation(fields: [matterId], references: [id])
  @@unique([matterId, userId])
}

model MatterParty {
  id           String  @id @default(uuid()) @db.Uuid
  tenantId     String  @db.Uuid
  matterId     String  @db.Uuid
  proceedingId String? @db.Uuid
  contactId    String  @db.Uuid
  role         String  // CLIENT, PLAINTIFF, DEFENDANT, PETITIONER, RESPONDENT, COMPLAINANT, ACCUSED, SURETY, WITNESS, OPPOSING_COUNSEL, OTHER
  side         String  // OURS, OPPOSITE, NEUTRAL
  counselName  String?
  counselContactId String? @db.Uuid
  note         String?
  matter       Matter  @relation(fields: [matterId], references: [id])
  @@index([tenantId, contactId])
}

model Vakalatnama {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  matterId     String    @db.Uuid
  proceedingId String?   @db.Uuid
  advocateIds  String[]  @db.Uuid
  signedById   String    @db.Uuid   // Contact who signed
  executedOn   DateTime? @db.Date
  scope        String?
  status       String    @default("PENDING") // PENDING, EXECUTED, FILED, WITHDRAWN, REVOKED
  validTill    DateTime? @db.Date
  documentId   String?   @db.Uuid
  note         String?
}
```

### 5.7 Reference data and proceedings

```prisma
model Forum {
  id              String  @id @default(uuid()) @db.Uuid
  tenantId        String? @db.Uuid   // null for global seed rows
  kind            String  // SUPREME, FSC, HIGH_COURT, HC_BENCH, SESSIONS, CIVIL, MAGISTRATE, FAMILY, RENT, BANKING, ATC, ACCOUNTABILITY, TRIBUNAL, REVENUE, LABOUR, CONSUMER, ARBITRATION, OTHER
  name            String
  nameUrdu        String?
  province        String?
  city            String?
  parentId        String? @db.Uuid   // bench under a High Court, court under a district
  statusUrl       String?
  causeListAdapter String?           // adapter key, null when manual only
  active          Boolean @default(true)
  @@index([kind, province])
}

model Judge {
  id          String  @id @default(uuid()) @db.Uuid
  tenantId    String? @db.Uuid
  forumId     String  @db.Uuid
  name        String
  designation String?
  active      Boolean @default(true)
}

model CaseType {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String?  @db.Uuid
  code          String   // CIVIL_SUIT, WRIT_PETITION, CRL_MISC_BAIL, CPLA
  name          String
  nameUrdu      String?
  abbreviation  String   // C.S., W.P., Crl. Misc.
  domain        String   // CIVIL, CRIMINAL, CONSTITUTIONAL, FAMILY, RENT, BANKING, TAX, SERVICE
  procedureCode String   // links to StageTemplate.procedureCode
  forumKinds    String[]
  @@unique([tenantId, code])
}

model StageTemplate {
  id            String  @id @default(uuid()) @db.Uuid
  tenantId      String? @db.Uuid
  procedureCode String
  name          String
  stages        Json    // ordered list: key, name, nameUrdu, expectedDays, defaultTasks[]
  version       Int     @default(1)
  active        Boolean @default(true)
  @@unique([tenantId, procedureCode, version])
}

model Proceeding {
  id                String           @id @default(uuid()) @db.Uuid
  tenantId          String           @db.Uuid
  matterId          String           @db.Uuid
  parentId          String?          @db.Uuid   // an appeal or revision arises from this proceeding
  forumId           String           @db.Uuid
  caseTypeId        String           @db.Uuid
  caseNumber        Int?
  caseYear          Int?
  rawCaseNumber     String?
  diaryNumber       String?
  title             String           // Plaintiff versus Defendant as written in the cause list
  ourSide           String           // PLAINTIFF, DEFENDANT, PETITIONER, RESPONDENT, COMPLAINANT, ACCUSED, APPLICANT, APPELLANT
  status            ProceedingStatus @default(ACTIVE)
  stageKey          String?
  filedOn           DateTime?        @db.Date
  benchName         String?
  judgeId           String?          @db.Uuid
  firNumber         String?
  firDate           DateTime?        @db.Date
  policeStation     String?
  sections          String[]         // for example 302, 34 PPC
  claimValue        Decimal?         @db.Decimal(18, 2)
  courtFeePaid      Decimal?         @db.Decimal(18, 2)
  nextHearingOn     DateTime?        @db.Date   // denormalized from Hearing for fast lists
  disposedOn        DateTime?        @db.Date
  disposalOutcomeId String?          @db.Uuid
  notes             String?
  version           Int              @default(1)
  matter            Matter           @relation(fields: [matterId], references: [id])
  forum             Forum            @relation(fields: [forumId], references: [id])
  caseType          CaseType         @relation(fields: [caseTypeId], references: [id])
  @@unique([tenantId, forumId, caseTypeId, caseYear, caseNumber])
  @@index([tenantId, matterId])
  @@index([tenantId, nextHearingOn])
}

model ProceedingLink {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid
  fromId   String @db.Uuid
  toId     String @db.Uuid
  kind     String // CONNECTED, CONSOLIDATED, CROSS_APPEAL, ARISES_FROM, SAME_FIR
  @@unique([fromId, toId, kind])
}

model StageHistory {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  proceedingId String    @db.Uuid
  stageKey     String
  enteredOn    DateTime  @db.Date
  exitedOn     DateTime? @db.Date
  byUserId     String?   @db.Uuid
  note         String?
}
```

### 5.8 Hearings, orders, outcomes, cause list

```prisma
model Hearing {
  id                   String        @id @default(uuid()) @db.Uuid
  tenantId             String        @db.Uuid
  proceedingId         String        @db.Uuid
  hearingOn            DateTime      @db.Date
  courtroom            String?
  benchName            String?
  serialNo             Int?
  purpose              String?       // EVIDENCE, ARGUMENTS, FOR_ORDERS, REPLY, NOTICE, BAIL, SERVICE
  status               HearingStatus @default(SCHEDULED)
  source               String        // CAUSE_LIST, ORDER_SHEET, MANUAL, CLIENT_REPORTED
  causeListEntryId     String?       @db.Uuid
  adjournmentReasonId  String?       @db.Uuid
  adjournedAtRequestOf String?       // OUR_SIDE, OPPOSITE, COURT, BOTH
  notes                String?
  orderSummary         String?
  outcomeTypeId        String?       @db.Uuid
  nextHearingOn        DateTime?     @db.Date
  nextPurpose          String?
  nextHearingId        String?       @unique @db.Uuid
  briefDocumentId      String?       @db.Uuid
  recordedById         String?       @db.Uuid
  recordedAt           DateTime?
  clientRequestId      String?       @unique  // idempotency key from the offline outbox
  version              Int           @default(1)
  proceeding           Proceeding    @relation(fields: [proceedingId], references: [id])
  @@index([tenantId, hearingOn])
  @@index([proceedingId, hearingOn])
}

model HearingAppearance {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  hearingId   String   @db.Uuid
  userId      String   @db.Uuid
  role        String   // LEAD, ASSISTING, CLERK
  feeAmount   Decimal? @db.Decimal(18, 2)   // per appearance fee earned
  journalEntryId String? @db.Uuid
  hearing     Hearing  @relation(fields: [hearingId], references: [id])
  @@unique([hearingId, userId])
}

model Order {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  proceedingId     String    @db.Uuid
  hearingId        String?   @db.Uuid
  orderOn          DateTime  @db.Date
  kind             OrderKind
  summary          String
  reliefGranted    Json?
  outcomeTypeId    String?   @db.Uuid
  documentId       String?   @db.Uuid
  interimExpiresOn DateTime? @db.Date
  receivedOn       DateTime? @db.Date
  proceeding       Proceeding @relation(fields: [proceedingId], references: [id])
  @@index([proceedingId, orderOn])
}

model OutcomeType {
  id       String  @id @default(uuid()) @db.Uuid
  tenantId String? @db.Uuid
  code     String  // BAIL_GRANTED, STAY_GRANTED, DECREED, DISMISSED_IN_DEFAULT
  name     String
  nameUrdu String?
  level    String  // HEARING, INTERIM, FINAL
  result   String  // FAVOURABLE, UNFAVOURABLE, NEUTRAL, PARTIAL
  triggers Json?   // suggested tasks and deadlines created when recorded
  active   Boolean @default(true)
  @@unique([tenantId, code])
}

model AdjournmentReason {
  id       String  @id @default(uuid()) @db.Uuid
  tenantId String? @db.Uuid
  code     String  // JUDGE_ON_LEAVE, COUNSEL_ABSENT, SERVICE_PENDING, STRIKE, TIME_SOUGHT, NOT_REACHED
  name     String
  nameUrdu String?
}

model CauseListEntry {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @db.Uuid
  forumId             String   @db.Uuid
  listOn              DateTime @db.Date
  benchName           String?
  courtroom           String?
  serialNo            Int?
  caseNumberRaw       String
  partiesRaw          String?
  purposeRaw          String?
  matchedProceedingId String?  @db.Uuid
  matchConfidence     Float?
  status              String   @default("NEW") // NEW, MATCHED, CONFIRMED, IGNORED
  sourceHash          String
  rawPayload          Json
  fetchedAt           DateTime @default(now())
  @@unique([tenantId, forumId, listOn, sourceHash])
  @@index([tenantId, listOn, status])
}
```

**Reconstruction note (12 November 2026).** Sections 5.9 through 5.12 and sections 6 through 17 were reconstructed from the design intent recorded in sections 1 to 5.8 (module map, enum vocabulary, conventions and RLS discipline) because the original file ended here. They are marked where a rule needs counsel or product sign-off before it ships. Treat this reconstruction as a draft for review, not as the agreed blueprint of record, until signed off.

### 5.9 Deadlines, limitation and certified copies

```prisma
model LimitationRule {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId        String?  @db.Uuid   // null = global seed row, counsel verified
  procedureCode   String
  domain          String               // CIVIL, CRIMINAL, FAMILY, RENT, BANKING, TAX, SERVICE
  fromEvent       String               // DECREE_DELIVERED, ORDER_RECEIVED, FIR_REGISTERED, ORDER_SHEET_RECEIVED
  period          Int
  periodKind      String               // DAYS, MONTHS, YEARS
  excludeHolidays Boolean  @default(true)
  verified        Boolean  @default(false)  // counsel has signed off; unverified rules never auto compute
  effectiveFrom   DateTime @db.Date
  effectiveTo     DateTime? @db.Date
  version         Int      @default(1)
  active          Boolean  @default(true)
  @@unique([tenantId, procedureCode, fromEvent, version])
}

model Deadline {
  id             String    @id @default(uuid()) @db.Uuid
  tenantId       String    @db.Uuid
  matterId       String    @db.Uuid
  proceedingId   String?   @db.Uuid
  kind           String              // LIMITATION, COURT_ORDER, CERTIFIED_COPY, STATUTORY, MANUAL
  title          String
  dueOn          DateTime  @db.Date
  source         String    @default("MANUAL")  // MANUAL, COMPUTED, COURT_ORDER
  ruleId         String?   @db.Uuid
  ruleVersion    Int?
  computedFrom   Json?               // event and event date used for the computation
  confirmedById  String?   @db.Uuid  // required before a COMPUTED deadline becomes binding
  status         String    @default("OPEN")    // OPEN, MET, BREACHED, WAIVED
  waivedReason   String?
  reminderAt     DateTime?           // null means default cadence (section 12)
  version        Int       @default(1)
  deletedAt      DateTime?
  @@index([tenantId, dueOn, status])
  @@index([tenantId, matterId])
}

model CertifiedCopy {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  proceedingId String    @db.Uuid
  documentKind String               // JUDGMENT, DECREE, ORDER_SHEET, EXHIBIT, COPY_APPLICATION
  appliedOn    DateTime  @db.Date
  feePaid      Decimal?  @db.Decimal(18, 2)
  currency     String    @default("PKR")
  expectedOn   DateTime? @db.Date
  readyOn      DateTime? @db.Date
  receivedOn   DateTime? @db.Date
  note         String?
  @@index([tenantId, readyOn])
}

model Holiday {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String?  @db.Uuid   // null = normal calendar visible to all tenants
  date        DateTime @db.Date
  province    String?              // null = all Pakistan
  description String
  source      String   @default("MANUAL")  // MANUAL, IMPORTED
  @@unique([tenantId, date, province])
}
```

Rules:

- Manual deadlines ship in MVP. The computation engine (`deadline.recompute`) is V2 behind the `deadline-engine` flag.
- Only rules with `verified = true` compute anything. Computed deadlines are created with `confirmedById` empty and become binding only after a lawyer confirms. Suggest, never decide.
- `deadline.recompute` runs on holiday or rule change. It recomputes OPEN deadlines and flags changes for review; it never silently moves a limitation date.
- Breach detection runs nightly. A breached deadline flags the matter on the today board and notifies the lead partner.
- Short statutory clocks from dismissal in default, ex parte orders and interim orders are always VERIFY; they are never seeded as verified defaults.
- Receiving a JUDGMENT or DECREE certified copy auto drafts an appeal deadline suggestion (30 days or as verified). The lawyer confirms before it becomes binding.

### 5.10 Documents and document versions

```prisma
model Document {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  matterId         String    @db.Uuid
  proceedingId     String?   @db.Uuid
  folderId         String?   @db.Uuid
  title            String
  category         String              // PLEADING, ORDER, EVIDENCE, CORRESPONDENCE, IDENTITY, OTHER; validated against section 6
  confidentiality  Confidentiality @default(NORMAL)
  clientVisible    Boolean   @default(false)
  currentVersionId String?   @unique @db.Uuid
  retentionUntil   DateTime? @db.Date
  version          Int       @default(1)
  deletedAt        DateTime?
  @@index([tenantId, matterId, category])
}

model DocumentVersion {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  documentId   String   @db.Uuid
  version      Int
  storageKey   String
  fileName     String
  mimeType     String
  sizeBytes    BigInt
  sha256       String?    // streamed hash; integrity evidence for electronic proceedings
  virusStatus  String    @default("PENDING")  // PENDING, CLEAN, INFECTED, ERROR
  ocrStatus    String    @default("PENDING")  // PENDING, DONE, SKIPPED, FAILED
  ocrText      String?    // English and Urdu text layer
  searchVector String?    // tsvector for full text search
  uploadedById String?    @db.Uuid
  uploadedAt   DateTime  @default(now())
  @@unique([documentId, version])
}

model DocumentTemplate {
  id            String  @id @default(uuid()) @db.Uuid
  tenantId      String? @db.Uuid   // null = global seed row
  code          String              // VAKALATNAMA, SECTION_80_NOTICE, PLAINT, WRITTEN_STATEMENT, CERTIFIED_COPY_APPLICATION, POWER_OF_ATTORNEY, AFFIDAVIT
  name          String
  nameUrdu      String?
  body          String              // markdown or HTML with {{merge}} fields
  fields        Json                // ordered merge field definitions
  category      String
  version       Int     @default(1)
  active        Boolean @default(true)
  @@unique([tenantId, code, version])
}

model SharedLink {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  documentId    String    @db.Uuid
  tokenHash     String    @unique
  expiresAt     DateTime
  maxDownloads  Int?
  downloads     Int       @default(0)
  watermark     Boolean   @default(false)
  createdById   String    @db.Uuid
  createdAt     DateTime  @default(now())
  @@index([tenantId, documentId])
}
```

Rules:

- Never soft delete `DocumentVersion`. Retention is `retention.sweep` flagging files past `retentionUntil`; deletion requires partner approval and writes `AuditLog`.
- Downloads use short lived signed URLs and are written to `AuditLog`. Client copies can be watermarked.
- Templates are effective dated by version. Old versions stay readable for documents produced from them.
- Virus scan, SHA 256 and OCR are worker steps (section 4.5). A version is not READY until `virusStatus = CLEAN`.

### 5.11 Communications and notification preferences

```prisma
model Communication {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  matterId     String?   @db.Uuid
  proceedingId String?   @db.Uuid
  contactId    String?   @db.Uuid
  channel      Channel
  direction    String              // OUTBOUND, INBOUND
  templateCode String?
  subject      String?
  body         String
  bodyUrdu     String?
  status       String    @default("QUEUED")  // QUEUED, SENT, DELIVERED, FAILED, BOUNCED
  providerRef  String?
  costMicros   BigInt?             // per message cost for spend tracking
  sentById     String?   @db.Uuid
  sentAt       DateTime?
  receivedAt   DateTime?
  @@index([tenantId, matterId, sentAt])
  @@index([tenantId, contactId])
}

model NotificationPreference {
  id                 String  @id @default(uuid()) @db.Uuid
  tenantId           String  @db.Uuid
  userId             String  @db.Uuid
  channel            String             // SMS, EMAIL, PUSH, WHATSAPP
  hearingReminders   Boolean @default(true)
  deadlineReminders  Boolean @default(true)
  invoiceNotices     Boolean @default(true)
  taskAssignments    Boolean @default(true)
  quietHoursStart    Int?               // hour 0 to 23, Asia/Karachi
  quietHoursEnd      Int?
  @@unique([tenantId, userId, channel])
}
```

Notifications are transactional and deliverability is tracked per message via provider webhooks. Hearing reminders default on. Opting out is allowed but logged. OTP and invoices bypass quiet hours.

### 5.12 Finance

```prisma
model FeeArrangement {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  clientId      String    @db.Uuid
  matterId      String?   @db.Uuid   // null = client wide retainer
  kind          String               // PER_APPEARANCE, PER_STAGE, LUMP_SUM, RETAINER
  stageKey      String?
  amount        Decimal   @db.Decimal(18, 2)
  currency      String    @default("PKR")
  effectiveFrom DateTime  @db.Date
  effectiveTo   DateTime? @db.Date
  version       Int       @default(1)
  deletedAt     DateTime?
  @@index([tenantId, clientId, matterId])
}

model JournalEntry {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  officeId     String?   @db.Uuid
  entryType    String               // FEE, EXPENSE, RECEIPT, DISBURSEMENT, TRANSFER, WRITEOFF
  memo         String?
  currency     String    @default("PKR")
  matterId     String?   @db.Uuid
  clientId     String?   @db.Uuid
  postedAt     DateTime  @default(now())
  postedById   String    @db.Uuid
  reversalOfId String?   @db.Uuid   // corrections are new entries reversing the old one
  createdAt    DateTime  @default(now())
  @@index([tenantId, clientId, postedAt])
}

model JournalLine {
  id        String  @id @default(uuid()) @db.Uuid
  entryId   String  @db.Uuid
  account   String              // account code, see chart of accounts in section 8
  debit     Decimal @db.Decimal(18, 2) @default(0)
  credit    Decimal @db.Decimal(18, 2) @default(0)
  matterId  String? @db.Uuid
  clientId  String? @db.Uuid
  note      String?
}

model Invoice {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  number     String
  clientId   String    @db.Uuid
  matterId   String?   @db.Uuid
  status     String    @default("DRAFT")  // DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID
  issueDate  DateTime  @db.Date
  dueDate    DateTime? @db.Date
  currency   String    @default("PKR")
  subtotal   Decimal   @db.Decimal(18, 2)
  taxAmount  Decimal   @db.Decimal(18, 2) @default(0)
  total      Decimal   @db.Decimal(18, 2)
  voidReason String?
  version    Int       @default(1)
  @@unique([tenantId, number])
}

model InvoiceLine {
  id          String  @id @default(uuid()) @db.Uuid
  invoiceId   String  @db.Uuid
  description String
  quantity    Decimal @db.Decimal(18, 2) @default(1)
  unitPrice   Decimal @db.Decimal(18, 2)
  amount      Decimal @db.Decimal(18, 2)
}

model PaymentAllocation {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @db.Uuid
  invoiceId  String   @db.Uuid
  amount     Decimal  @db.Decimal(18, 2)
  method     String   // CASH, BANK, RAAST, WALLET, WITHHOLDING
  reference  String?
  receivedOn DateTime @db.Date
  @@index([tenantId, invoiceId])
}

model WithholdingCertificate {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  clientId      String   @db.Uuid
  certificateNo String
  taxYear       Int
  amount        Decimal  @db.Decimal(18, 2)
  rate          Decimal  @db.Decimal(5, 2)
  issuedOn      DateTime @db.Date
  documentId    String?  @db.Uuid
}
```

Rules:

- Append only. Application code has no update or delete path for `JournalLine`. Corrections are reversal entries. A CI test asserts every `JournalEntry` balances (sum debits equals sum credits) in its currency.
- Money is `Decimal(18, 2)` with a currency code on every row. Never float.
- Client money is segregated. Journal lines tagged `clientId` against client money accounts must never take a client balance negative. Enforced in the service layer and asserted in a CI test.
- Per client money ledger is MVP. Three way reconciliation (bank statement vs ledger vs client statements) is V2.
- Court fee and stamp duty are recorded on the proceeding (`courtFeePaid`) and traced to the fee schedule configuration, which is effective dated and VERIFY.

## 6. Reference data and rules

### 6.1 Global seed tables (tenantId null)

Seeded once at deployment, editable per tenant by copying rows down to tenant scope. All are versioned and effective dated where they change legal effect.

| Table | Contents | Phase |
| --- | --- | --- |
| Forum | Forum map from section 2.1, with cause list adapter keys and status URLs | MVP |
| CaseType | Pattern key, abbreviation, procedureCode, forum kinds from section 2.2 | MVP |
| StageTemplate | One row per procedureCode, ordered stages with expected days and default tasks | MVP |
| OutcomeType | Outcome codes with level (HEARING, INTERIM, FINAL), result (FAVOURABLE, UNFAVOURABLE, NEUTRAL, PARTIAL) and triggers | MVP |
| AdjournmentReason | JUDGE_ON_LEAVE, COUNSEL_ABSENT, SERVICE_PENDING, STRIKE, TIME_SOUGHT, NOT_REACHED, OTHER | MVP |
| LimitationRule | Effective dated limitation rules, `verified = false` until counsel signs off | V2 |
| Holiday | Normal Pakistani holidays plus per province optional overrides | MVP |
| DocumentTemplate | Vakalatnama, Section 80 CPC notice, plaint, written statement, certified copy application, power of attorney, affidavit | MVP |
| NotificationTemplate | Hearing reminder, deadline reminder, invoice notice, certified copy ready, task assignment; English and Urdu bodies | MVP |
| CourtFeeSchedule | Filing fee by forum, claim value band and province | VERIFY |
| TaxConfiguration | Withholding and services tax parameters, default off | VERIFY |

Rules are data, not code. Editing a limitation rule, a stage template or a fee schedule never requires a deploy; it creates a new version and takes effect from `effectiveFrom`.

### 6.2 Stage templates

`StageTemplate.stages` is an ordered JSON list. Each entry: `key`, `name`, `nameUrdu`, `expectedDays`, `defaultTasks[]` (title, role, offsetDays). When a proceeding enters a stage, the API instantiates the stage's `defaultTasks` as tasks tied to that proceeding. Entering a stage is an explicit user action or comes from an order recorded with an outcome that changes stage; it never happens implicitly.

Stage keys are stable identifiers (for example `ISSUES_FRAMED`), never localized names. Localized strings can change without data migration.

### 6.3 Outcome triggers and default-task flow

`OutcomeType.triggers` is a JSON list of suggested follow-ups. Example (recording an interim stay): `{ "createDeadline": false, "createTasks": [
{ "title": "Diarize interim expiry", "offsetDays": 0 },
{ "title": "obtain certified copy of stay order", "offsetDays": 1 }], "setProceedingStatus": "STAYED" }`.

Triggers create suggestions shown to the lawyer after recording, not records silently created. A click confirms. As with all computed legal effects, the system suggests and a human decides.

### 6.4 Case number parsing

Parser takes `rawCaseNumber` and the forum, matches against `CaseType.abbreviation` and a set of regexes per pattern family (section 2.2), and returns `caseNumber`, `caseYear`, `caseTypeId`, plus confidence. If confidence is below the threshold or no pattern matches, fields stay empty and the raw string is kept. Parsing is a suggestion; the user can always override both fields. Parser snapshot tests lock the accepted examples.

Parsing never runs on read; it runs at entry time and at import time only.

### 6.5 Cause lists and adapter contract

Each adapter implements:

```text
fetch(forum, listOn): RawEntry[]      // HTTP or HTML parse, timeout 30s, 2 retries
normalize(raw): NormalizedEntry       // caseNumberRaw, partiesRaw, purposeRaw, serialNo, benchName, courtroom
hash(entry): string                   // content hash for sourceHash
```

Every `CauseListEntry` keeps `rawPayload` untouched and `sourceHash` for dedup. Matching to proceedings scores on case number (exact, after normalization), parties, and year; ties and near misses go to the inbox for human resolution with one-tap actions (Match, Ignore, Create proceeding). Every imported list is shown with fetch time and source so an operator can see staleness. A court that breaks its contract or Terms of Use is switched to manual paste; there is no scraper that is allowed to run past a site's robots or terms.

### 6.6 Effective-dating and versioning contract

Versioned rule tables (`LimitationRule`, `StageTemplate`, `CourtFeeSchedule`, `TaxConfiguration`, `DocumentTemplate`) follow:

- `version` increments; uniqueness is per (tenant, natural key, version).
- `effectiveFrom`/`effectiveTo` bound the validity window; queries always filter by date.
- Global seed rows are copied, not edited, when a tenant needs a different value.
- A superseded version stays in the table; the audit trail says who changed what and when.
- Deleting a rule row is forbidden. Deactivate with `active = false`.

## 7. Core flows

### 7.1 Intake to engagement

1. Lead created (source: referral, walk-in, website, repeat client) with contact details or link to existing contact.
2. Conflict check runs across contacts, parties, matters and relations (CNIC hash, names with trigram similarity, phones). Human decides: CLEAR, WAIVED, DECLINED, always with a note. Never auto-decided.
3. If CLEAR/WAIVED: quote and engagement letter generated from DocumentTemplate. If accepted, matter is created with number in `YYYY/LIT/NNNN`, client, lead partner, type and practice area.
4. Vakalatnama created as PENDING; execution checklist assigned to the clerk. Matter status moves to ENGAGED then OPEN.
5. Opening tasks from the matter type checklist are created for the lead.

### 7.2 Hearing day

1. Cause list fetched (or pasted) into the inbox before court hours. Counsel sees today's boards with serial numbers.
2. One tap opens the matter for that serial: today's stage, last order, documents, fees due.
3. After the hearing, one tap capture: outcome (from OutcomeType), adjournment reason if any, next date, next purpose. Offline capture syncs later; server dedups on `clientRequestId`.
4. Capture creates or updates the next `Hearing`, appends `StageHistory` when stage changes, writes `AuditLog`, and schedules reminders (T-3, T-1, day-of).
5. Appearance fees post journal entries automatically if the fee arrangement says PER_APPEARANCE (amount from the arrangement, override allowed).

### 7.3 Matter closing

1. Lead partner marks the matter closed with reason (COMPLETED, WITHDRAWN, TRANSFERRED, NONPAYMENT, CLIENT_REQUEST) and closing outcome (for LITIGATION: decree, dismissal, settlement, other).
2. System lists open tasks, future hearings, open deadlines; the partner must resolve or dispose each with a note.
3. Final invoice generation offered. Remaining retainer or client money balance shown; unapplied money is returned per the engagement terms before the ledger is zeroed.
4. Files move under retention policy (default 7 years, configurable per matter type, VERIFY per firm policy). Matter archived, not deleted. Audited.

### 7.4 Certified copy flow

1. Clerk records the application (documentKind, appliedOn, fee) and queues the order for the clerk responsible.
2. On readyOn the clerk marks READY; the firm is notified; on receivedOn limitation-impacting dates are suggested (judgment received today; appeal suggestion drafted).
3. Certified copy days are always candidates for limitation computation, always lawyer-confirmed.

### 7.5 Client money in and out

1. Receipt (cash, bank, Raast, wallet) recorded against client and matter. Posts RECEIPT journal: debit bank/cash, credit client money (liability).
2. Fee earning events (appearance, stage completion, lump sum milestone or retainer period end) post FEE journal: debit client money or accounts receivable per engagement, credit fee income.
3. Invoice issued from fees; allocation records payments; withholding certificates recorded when the client deducts tax; the net fees vs certificate is reconciled by the accountant monthly.
4. Disbursements (court fee, stamp duty, certified copy fees, photocopies) post DISBURSEMENT: debit client, credit bank/cash. Client approves where the engagement says so.
5. Transfer between client money and fees-at-hand requires an approved journal transfer; it is visible, audited and reportable.

### 7.6 Compliance notice flow (Section 80 CPC and similar)

Drafted from template with the required particulars, served per statutory mode, tracked to acknowledgement or expiry; the proceeding's limitation clock reads the acknowledgement/expiry date. All VERIFY: service modes, statutory durations and government entity scope differ; the template is a starting point for counsel review, not legal advice.

## 8. Finance design

### 8.1 Principles

1. Money is append-only. The only correction is a reversal entry.
2. Client money is the client's money. It is held in liability accounts, never in income, and can never go negative for a client.
3. Every money row carries currency. Pakistan first means PKR is the default, not the only option.
4. Tax is configuration, effective dated, default off. No tax default ships enabled.
5. Suggest, never decide: the system drafts entries; a person with `finance.post` posts them; a different person with `finance.approve` approves above thresholds.

### 8.2 Chart of accounts (default)

Seeded per tenant, extendable. Accounts are code + name + type (ASSET, LIABILITY, INCOME, EXPENSE, EQUITY) + `isClientMoney` flag.

| Code | Name | Type | Client money |
| --- | --- | --- | --- |
| 1000 | Cash on hand | ASSET | no |
| 1010 | Bank — current | ASSET | no |
| 1015 | Bank — client money | ASSET | yes |
| 2000 | Accounts payable | LIABILITY | no |
| 2100 | Client money held | LIABILITY | yes |
| 3000 | Owner equity | EQUITY | no |
| 4000 | Advocate fees — appearances | INCOME | no |
| 4010 | Advocate fees — stages | INCOME | no |
| 4020 | Advocate fees — retainer | INCOME | no |
| 4030 | Advocate fees — lump sum | INCOME | no |
| 5000 | Office expenses | EXPENSE | no |
| 5010 | Disbursements recoverable | EXPENSE | no |
| 1100 | Accounts receivable | ASSET | no |

### 8.3 Fee models and posting rules

| Model | Trigger | Journal entry |
| --- | --- | --- |
| PER_APPEARANCE | Hearing recorded with appearance by an advocate with a fee in the FeeArrangement | Debit AR or client money (if in credit), credit 4000 |
| PER_STAGE | Stage change confirmed by user | Debit AR or client money, credit 4010 |
| LUMP_SUM | Milestone percent configured (on filing, on evidence, on judgment) recorded by user | As configured per milestone |
| RETAINER | Monthly, in advance | Debit client money or AR, credit 4020 |

### 8.4 Invoice states

DRAFT → ISSUED → PARTIALLY_PAID → PAID. Void only before payment allocation; void after allocation requires reversal of allocations first. Invoice numbers sequential per tenant per year (`INV/2026/0001`), gaps explained in audit.

### 8.5 Withholding certificate reconciliation

Client deducts withholding income tax at source. Certificate received → recorded with tax year, rate, amount; net fee vs certificate vs bank receipt reconciled before invoice closure. Certificates are evidence for income tax filings; the accountant exports the register per tax year.

### 8.6 Three way reconciliation (V2)

Bank statement (imported CSV) vs client money ledger (sum of client balances) vs sub ledger per client. Discrepancy over an effective dated tolerance flags the month and blocks the reconciliation report. Never automated away; the accountant signs.

## 9. API design

### 9.1 Conventions

- REST under `/api`, JSON, OpenAPI at `/api/openapi.json`. All list endpoints paginate with cursor or `page`/`pageSize`.
- Resource naming is plural nouns: `/api/matters`, `/api/proceedings`, `/api/hearings`, `/api/tasks`, `/api/invoices`.
- Guard order on every controller: `JwtAuthGuard` → `TenantGuard` → `PermissionGuard` (for the permission the handler needs) → `MatterAccessGuard` (for matter-scoped handlers).
- Multi step writes happen inside `prisma.$transaction` with `set_config('app.tenant_id', …)` per section 4.3 and 4.4.
- Idempotency: `POST` money, filing and hearing capture endpoints require `Idempotency-Key` (UUID). Replay with the same key returns the original response; same key with different body returns 409.
- Concurrency: mutable resources return `version`; `PATCH` requires `If-Match: <version>` and returns 412 on mismatch.
- Errors are RFC 9457 problem details: `type`, `title`, `status`, `detail`, `instance`, plus `code` (stable machine code).
- Dates: `YYYY-MM-DD` for court dates; ISO 8601 UTC for timestamps. Money: string in major units with `currency` alongside (`"15000.00", "PKR"`); never floats.
- Every write endpoint emits an `OutboxEvent` in the same transaction as its state change. Consumers are idempotent.

### 9.2 Core endpoint families

| Family | Endpoints (shape) | Phase |
| --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/totp/verify`, `GET /auth/sessions`, `DELETE /auth/sessions/:id` | MVP |
| Tenancy and users | `/tenants/me`, `/offices`, `/users`, `/invites`, `/roles`, `/permissions` | MVP |
| Contacts | `/contacts`, `/contacts/:id/relations`, `/contacts/:id/kyc` | MVP |
| Leads and conflicts | `/leads`, `/leads/:id/convert`, `POST /conflicts/check`, `POST /conflicts/:id/decision` | MVP |
| Matters | `/matters`, `/matters/:id/team`, `/matters/:id/parties`, `/matters/:id/access`, `/matters/:id/close` | MVP |
| Proceedings | `/proceedings`, `/proceedings/:id/stages`, `POST /proceedings/:id/links` | MVP |
| Hearings | `POST /hearings`, `POST /hearings/:id/outcome` (one-tap capture), `GET /hearings/today`, `POST /hearings/clash-check` | MVP |
| Cause list | `/cause-lists/inbox`, `POST /cause-lists/import`, `POST /cause-lists/:id/match`, `POST /cause-lists/:id/ignore` | MVP (two courts) |
| Deadlines | `/deadlines`, `POST /deadlines/:id/confirm`, `POST /deadlines/:id/waive` | MVP manual, V2 engine |
| Tasks | `/tasks`, `/tasks/:id/notes`, `/tasks/:id/complete` | MVP |
| Documents | `POST /documents/:id/versions` (presign flow), `POST /documents/:id/versions/confirm`, `POST /shared-links`, `GET /documents/:id/download` | MVP |
| Finance | `/fee-arrangements`, `/invoices`, `POST /invoices/:id/issue`, `POST /invoices/:id/allocations`, `POST /journal/entries`, `POST /journal/entries/:id/reverse`, `GET /reports/client-ledger/:clientId` | Basic MVP |
| Communications | `/communications`, `/communications/inbound` (provider webhook), `/notification-templates` | MVP SMS and email |
| Reports | `/reports/kpi`, `/reports/aging`, `/reports/realization`, `GET /reports/:id/export` | V2 |
| Client portal | `/portal/me`, `/portal/hearings`, `/portal/invoices`, `/portal/documents` | V2 |
| AI | `/ai/summarize`, `/ai/query`, `/ai/voice-notes` | V3, flagged |

### 9.3 Webhooks and provider callbacks

Inbound provider webhooks (SMS delivery receipts, WhatsApp messages, email inbound filing, payments) are authenticated per provider (signature or shared secret), logged raw, and processed asynchronously. Every webhook is idempotent on the provider's message id.

### 9.4 Rate limiting and quotas

Per tenant per minute buckets: auth 20, reads 600, writes 120, uploads 30, AI 30 (V3). Buckets are enforced at the gateway and again in the app (defense in depth). 429 responses include `Retry-After`.

### 9.5 Versioning and deprecation

The API is `v1` implicitly; breaking changes require `v2` path prefix and a deprecation window of 90 days with `Sunset` headers. Non breaking additions ship any time.

## 10. Frontend specification

### 10.1 Routes

```text
(auth)           /login, /invite/[token], /forgot-password, /reset-password, /change-password
(dashboard)      /dashboard                     today board: hearings, deadlines, cause list inbox counts
                 /matters                       list + filters; /matters/[id] workspace (tabs: Overview, Proceedings, Hearings, Documents, Deadlines, Tasks, Finance, Timeline)
                 /proceedings/[id]              forum, case number, stage, judge, party and order history
                 /calendar                       month/week/day agenda generated from hearings + deadlines + tasks
                 /cause-list                    inbox: NEW entries, one tap match/ignore/create
                 /deadlines                      open/breached, confirm computed suggestions
                 /tasks                          my tasks, team board
                 /documents                      matter-scoped library, version compare (V2)
                 /finance                        invoices, journal, client ledgers, withholding register
                 /reports                        KPI dashboards (V2)
                 /settings                       firm, offices, users, roles, templates, rules, retention
(portal)         /portal                        V2: client view of hearings, documents, dues
```

### 10.2 Key screens

- **Today board:** columns Today (hearings with serial numbers), Tomorrow, This week; deadline breaches in red; one tap to matter.
- **Hearing capture:** outcome → adjournment reason (if any) → next date + purpose; Urdu input supported; voice note recorded against the hearing (V3); works offline, queued and synced with `clientRequestId`.
- **Matter workspace:** header (number, parties, forum, stage, next hearing), tabs as above. Timeline merges hearings, orders, stage history, tasks, document versions and communications chronologically.
- **Cause list inbox:** fetch or paste; each entry card: serial, case number raw, parties, purpose, suggested match with confidence; buttons Match / Ignore / New proceeding.
- **Finance workbench:** client money balances, unmatched payments, unapplied advance fees, invoices aging, monthly reconciliation checklist (V2).

### 10.3 Design system and bilingual

Tailwind tokens from `styles/tokens.css` (colors, spacing, radii). English default, Urdu via `next-intl` with `dir="rtl"` toggle on document root; logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) everywhere; no physical left/right utilities. Fonts: Inter (Latin), Noto Nastaliq Urdu or Noto Naskh Arabic. Hijri dates shown next to Gregorian in family/inheritance documents.

### 10.4 State, data fetching, offline

TanStack Query for server state; Redux Toolkit only for global UI (sidebar, hearing capture sheet, dialer, toasts). Server components fetch initial data; client components mutate via `/api/*` proxies to NestJS.

PWA shell (V2): service worker caches the app shell and the today board read-only; IndexedDB queue for hearing capture outbox; background sync posts when online. Show explicit queued/synced states; never lose a captured outcome.

### 10.5 Accessibility and performance

Keyboard reachable everything; visible focus; AA contrast; `prefers-reduced-motion` honored. LCP < 2.0s on the today board over 3G. Lists virtualized past 100 rows. Images via `next/image`. No client JavaScript on server-rendered lists.

### 10.6 Error UX

Every action has an optimistic-safe path and a failure toast with retry. 412 concurrency conflicts surface "Someone else changed this matter — reload?" Conflicts (409 idempotency) never surface raw. Offline capture shows a persistent badge until synced.
