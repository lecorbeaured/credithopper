-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PRO', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "Bureau" AS ENUM ('EQUIFAX', 'EXPERIAN', 'TRANSUNION');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('COLLECTION', 'LATE_PAYMENT', 'CHARGE_OFF', 'REPOSSESSION', 'FORECLOSURE', 'BANKRUPTCY', 'JUDGMENT', 'TAX_LIEN', 'INQUIRY', 'MEDICAL', 'STUDENT_LOAN', 'CREDIT_CARD', 'AUTO_LOAN', 'MORTGAGE', 'PERSONAL_LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'DISPUTING', 'DELETED', 'UPDATED', 'VERIFIED', 'WAITING');

-- CreateEnum
CREATE TYPE "DisputeRecommendation" AS ENUM ('DISPUTE_NOW', 'OPTIONAL', 'WAIT', 'DO_NOT_DISPUTE');

-- CreateEnum
CREATE TYPE "FurnisherType" AS ENUM ('CREDITOR', 'COLLECTION_AGENCY', 'ORIGINAL_CREDITOR', 'DEBT_BUYER', 'MEDICAL_PROVIDER', 'UTILITY', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeTarget" AS ENUM ('BUREAU', 'FURNISHER', 'BOTH');

-- CreateEnum
CREATE TYPE "DisputeMethod" AS ENUM ('CERTIFIED_MAIL', 'REGULAR_MAIL', 'ONLINE', 'FAX', 'PHONE');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'DELIVERED', 'IN_REVIEW', 'RESPONDED', 'VERIFIED', 'DELETED', 'UPDATED', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LETTER_SENT', 'RESPONSE_RECEIVED', 'SUPPORTING_DOC', 'CERTIFIED_RECEIPT', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "WinType" AS ENUM ('FULL_DELETION', 'PARTIAL_DELETION', 'BALANCE_UPDATE', 'STATUS_UPDATE', 'DATE_CORRECTION', 'ACCOUNT_CLOSED');

-- CreateEnum
CREATE TYPE "ComplaintAgency" AS ENUM ('CFPB', 'FTC', 'STATE_AG', 'BBB');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('DRAFT', 'FILED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('REGISTERED', 'LOGGED_IN', 'LOGGED_OUT', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'REPORT_UPLOADED', 'REPORT_PARSED', 'REPORT_DELETED', 'ITEM_ADDED', 'ITEM_UPDATED', 'ITEM_DELETED', 'DISPUTE_CREATED', 'DISPUTE_SENT', 'DISPUTE_RESPONSE', 'DISPUTE_ESCALATED', 'LETTER_GENERATED', 'LETTER_DOWNLOADED', 'WIN_RECORDED', 'PROFILE_UPDATED', 'SUBSCRIPTION_CHANGED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('INITIAL_DISPUTE', 'METHOD_OF_VERIFICATION', 'PROCEDURAL_VIOLATION', 'LEGAL_DEMAND', 'DEBT_VALIDATION', 'GOODWILL', 'IDENTITY_THEFT', 'PAY_FOR_DELETE', 'CEASE_AND_DESIST', 'CFPB_COMPLAINT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "googleId" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "zipCode" VARCHAR(10),
    "ssnLast4" VARCHAR(4),
    "ssnHash" TEXT,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "trialStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEnd" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "personalUseOnly" BOOLEAN NOT NULL DEFAULT true,
    "acceptedTermsAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bureau" "Bureau",
    "reportDate" TIMESTAMP(3),
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parsedAt" TIMESTAMP(3),
    "parseError" TEXT,
    "rawText" TEXT,
    "parsedData" JSONB,
    "reportName" TEXT,
    "reportAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negative_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditReportId" TEXT,
    "creditorName" TEXT NOT NULL,
    "originalCreditor" TEXT,
    "accountNumber" TEXT,
    "accountNumberMasked" TEXT,
    "accountType" "AccountType" NOT NULL,
    "balance" DECIMAL(12,2),
    "originalBalance" DECIMAL(12,2),
    "highCredit" DECIMAL(12,2),
    "creditLimit" DECIMAL(12,2),
    "monthlyPayment" DECIMAL(12,2),
    "accountStatus" TEXT,
    "paymentStatus" TEXT,
    "dateOpened" TIMESTAMP(3),
    "dateClosed" TIMESTAMP(3),
    "dateOfFirstDelinquency" TIMESTAMP(3),
    "lastActivityDate" TIMESTAMP(3),
    "lastReportedDate" TIMESTAMP(3),
    "onEquifax" BOOLEAN NOT NULL DEFAULT false,
    "onExperian" BOOLEAN NOT NULL DEFAULT false,
    "onTransunion" BOOLEAN NOT NULL DEFAULT false,
    "fallsOffDate" TIMESTAMP(3),
    "monthsUntilFallsOff" INTEGER,
    "solExpired" BOOLEAN,
    "recommendation" "DisputeRecommendation",
    "recommendationReason" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedFromBureaus" "Bureau"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "furnisherId" TEXT,

    CONSTRAINT "negative_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "furnishers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternateName" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" VARCHAR(2),
    "zipCode" VARCHAR(10),
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "furnisherType" "FurnisherType" NOT NULL DEFAULT 'CREDITOR',
    "isFtcBanned" BOOLEAN NOT NULL DEFAULT false,
    "responsePattern" TEXT,
    "avgResponseDays" INTEGER,
    "successRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "furnishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "negativeItemId" TEXT NOT NULL,
    "target" "DisputeTarget" NOT NULL,
    "targetBureau" "Bureau",
    "furnisherId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "disputeReason" TEXT NOT NULL,
    "legalBasis" TEXT[],
    "letterTemplateId" TEXT,
    "letterContent" TEXT,
    "letterPdfPath" TEXT,
    "trackingNumber" TEXT,
    "method" "DisputeMethod" NOT NULL DEFAULT 'CERTIFIED_MAIL',
    "status" "DisputeStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseType" TEXT,
    "responseNotes" TEXT,
    "escalationReason" TEXT,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_documents" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "negativeItemId" TEXT NOT NULL,
    "winType" "WinType" NOT NULL,
    "bureausAffected" "Bureau"[],
    "debtEliminated" DECIMAL(12,2),
    "estimatedScoreImpact" INTEGER,
    "description" TEXT,
    "roundAchieved" INTEGER,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_complaints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agency" "ComplaintAgency" NOT NULL,
    "targetType" "DisputeTarget" NOT NULL,
    "targetBureau" "Bureau",
    "targetFurnisher" TEXT,
    "complaintNumber" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'FILED',
    "complaintText" TEXT NOT NULL,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseDate" TIMESTAMP(3),
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_laws" (
    "id" TEXT NOT NULL,
    "stateCode" VARCHAR(2) NOT NULL,
    "stateName" TEXT NOT NULL,
    "solWrittenContract" INTEGER NOT NULL,
    "solOralContract" INTEGER NOT NULL,
    "solPromissoryNote" INTEGER NOT NULL,
    "solOpenAccount" INTEGER NOT NULL,
    "additionalProtections" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "state_laws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bureau_addresses" (
    "id" TEXT NOT NULL,
    "bureau" "Bureau" NOT NULL,
    "disputeStreet" TEXT NOT NULL,
    "disputeCity" TEXT NOT NULL,
    "disputeState" VARCHAR(2) NOT NULL,
    "disputeZip" VARCHAR(10) NOT NULL,
    "onlineDisputeUrl" TEXT,
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bureau_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL,
    "targetType" "DisputeTarget" NOT NULL,
    "accountTypes" "AccountType"[],
    "round" INTEGER,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "phraseVariations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "bundleId" TEXT NOT NULL,
    "bundleName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT DEFAULT 'website',
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_downloads" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "bundleId" TEXT NOT NULL,
    "bundleName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_stripeCustomerId_idx" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "credit_reports_userId_idx" ON "credit_reports"("userId");

-- CreateIndex
CREATE INDEX "credit_reports_parseStatus_idx" ON "credit_reports"("parseStatus");

-- CreateIndex
CREATE INDEX "credit_reports_expiresAt_idx" ON "credit_reports"("expiresAt");

-- CreateIndex
CREATE INDEX "negative_items_userId_idx" ON "negative_items"("userId");

-- CreateIndex
CREATE INDEX "negative_items_creditReportId_idx" ON "negative_items"("creditReportId");

-- CreateIndex
CREATE INDEX "negative_items_accountType_idx" ON "negative_items"("accountType");

-- CreateIndex
CREATE INDEX "negative_items_status_idx" ON "negative_items"("status");

-- CreateIndex
CREATE INDEX "negative_items_fallsOffDate_idx" ON "negative_items"("fallsOffDate");

-- CreateIndex
CREATE INDEX "furnishers_name_idx" ON "furnishers"("name");

-- CreateIndex
CREATE INDEX "disputes_userId_idx" ON "disputes"("userId");

-- CreateIndex
CREATE INDEX "disputes_negativeItemId_idx" ON "disputes"("negativeItemId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "disputes_dueDate_idx" ON "disputes"("dueDate");

-- CreateIndex
CREATE INDEX "dispute_documents_disputeId_idx" ON "dispute_documents"("disputeId");

-- CreateIndex
CREATE INDEX "wins_userId_idx" ON "wins"("userId");

-- CreateIndex
CREATE INDEX "wins_achievedAt_idx" ON "wins"("achievedAt");

-- CreateIndex
CREATE INDEX "regulatory_complaints_userId_idx" ON "regulatory_complaints"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "state_laws_stateCode_key" ON "state_laws"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "bureau_addresses_bureau_key" ON "bureau_addresses"("bureau");

-- CreateIndex
CREATE INDEX "letter_templates_category_idx" ON "letter_templates"("category");

-- CreateIndex
CREATE INDEX "letter_templates_targetType_idx" ON "letter_templates"("targetType");

-- CreateIndex
CREATE INDEX "bundle_leads_email_idx" ON "bundle_leads"("email");

-- CreateIndex
CREATE INDEX "bundle_leads_bundleId_idx" ON "bundle_leads"("bundleId");

-- CreateIndex
CREATE INDEX "bundle_leads_createdAt_idx" ON "bundle_leads"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_leads_email_bundleId_key" ON "bundle_leads"("email", "bundleId");

-- CreateIndex
CREATE INDEX "bundle_downloads_bundleId_idx" ON "bundle_downloads"("bundleId");

-- CreateIndex
CREATE INDEX "bundle_downloads_email_idx" ON "bundle_downloads"("email");

-- CreateIndex
CREATE INDEX "bundle_downloads_createdAt_idx" ON "bundle_downloads"("createdAt");

-- AddForeignKey
ALTER TABLE "credit_reports" ADD CONSTRAINT "credit_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negative_items" ADD CONSTRAINT "negative_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negative_items" ADD CONSTRAINT "negative_items_creditReportId_fkey" FOREIGN KEY ("creditReportId") REFERENCES "credit_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negative_items" ADD CONSTRAINT "negative_items_furnisherId_fkey" FOREIGN KEY ("furnisherId") REFERENCES "furnishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_negativeItemId_fkey" FOREIGN KEY ("negativeItemId") REFERENCES "negative_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_furnisherId_fkey" FOREIGN KEY ("furnisherId") REFERENCES "furnishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_documents" ADD CONSTRAINT "dispute_documents_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wins" ADD CONSTRAINT "wins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wins" ADD CONSTRAINT "wins_negativeItemId_fkey" FOREIGN KEY ("negativeItemId") REFERENCES "negative_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
