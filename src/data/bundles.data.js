// ===========================================
// CREDITHOPPER - BUNDLE DEFINITIONS
// ===========================================

/**
 * Letter template content - matches frontend/js/bundles.js
 * Each letter has: id, title, content
 */
const letterTemplates = {
  // ===========================================
  // BASICS
  // ===========================================
  'general-dispute': {
    title: 'General Dispute Letter',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute - Please Verify This Information

To Whom It May Concern,

I reviewed my credit report and I'm disputing the following item because I don't believe it's being reported accurately:

Account Name: [Creditor Name]
Account Number: [Account Number]

I'm requesting that you verify this information is 100% accurate and complete. Please provide me with proof of how this was verified, including the name and contact information of anyone you spoke with.

If this cannot be fully verified with documented proof, please remove it from my credit report immediately.

Please send me an updated copy of my credit report showing the results of your investigation.

[Your Name]`
  },

  'debt-validation': {
    title: 'Debt Validation Letter',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Validation Required

To Whom It May Concern,

I received communication about the account above. I'm requesting that you validate this debt before any further action.

Please provide:

1. Proof that I owe this specific amount
2. The original signed agreement bearing my signature
3. A complete payment history from the original creditor
4. Proof that you're licensed to collect in my state
5. Proof that the statute of limitations hasn't expired

Do not contact me again until you have provided all of this documentation. Do not report this to any credit bureau until you have validated it, or update any existing reporting to show it's disputed.

If you cannot provide this validation, remove any credit reporting and close your file on this account.

[Your Name]`
  },

  'goodwill': {
    title: 'Goodwill Adjustment Letter',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account Number [Account Number]

Dear [Company Name],

I've been a customer since [year] and I'm writing about a late payment from [month/year].

Here's what happened: [brief explanation - life event, oversight, etc.]

Looking at my overall history with you, I've been a good customer. I'm asking if you'd consider removing this one late payment as a goodwill gesture.

I'd really appreciate you taking a look at my account history and considering this request.

Thank you for your time.

[Your Name]`
  },

  'credit-report-request': {
    title: 'Credit Report Request Letter',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Free Annual Credit Report

To Whom It May Concern,

I'm requesting my free annual credit report as allowed under federal law.

Here's my information:
- Full Name: [Your Full Name]
- Date of Birth: [Your DOB]
- Social Security Number: [Last 4 digits: XXX-XX-####]
- Current Address: [Your Address]
- Previous Address (if moved in last 2 years): [Previous Address]

Please send my complete credit report to the address above.

[Your Name]`
  },

  'dispute-results-followup': {
    title: 'Dispute Results Follow-up Letter',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Follow-up on Dispute - [Original Dispute Date]

To Whom It May Concern,

I submitted a dispute on [Date] about [Account Name/Number]. I haven't received results, or the results don't make sense.

What I disputed: [Brief description]
What you told me: [Their response, if any]
Why this isn't resolved: [Explain the problem]

I need you to:
1. Send me the actual results of your investigation
2. Tell me exactly how you verified this information
3. Give me the name and contact info of who you spoke with
4. Explain why you think your verification was adequate

If you can't show me you did a real investigation, this information needs to come off my report.

[Your Name]`
  },

  'method-of-verification': {
    title: 'Method of Verification Request',
    category: 'basics',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Method of Verification - Account [Account Number]

To Whom It May Concern,

You recently "verified" information I disputed. I'm entitled to know exactly how you verified it.

Account: [Creditor Name]
Account Number: [Number]
Date of my dispute: [Date]
Your response: "Verified as accurate"

That's not good enough. Tell me:
1. Who did you contact to verify this?
2. What documents did you review?
3. What specific information did they provide?
4. How did you confirm the information was accurate?

Saying "we verified it" without showing your work doesn't count. If you can't explain how you verified this, you didn't actually verify it.

[Your Name]`
  },

  // ===========================================
  // COLLECTIONS
  // ===========================================
  'collection-account-dispute': {
    title: 'Collection Account Dispute Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Collection Account

To Whom It May Concern,

There's a collection account on my report that shouldn't be there:

Collection Agency: [Agency Name]
Account Number: [Number]
Amount: $[Amount]

I'm disputing this because: [Choose one or more]
- I don't recognize this debt
- This isn't my account
- The amount is wrong
- This was already paid
- This is past the statute of limitations
- The original creditor info is missing or wrong

Verify every detail of this account with documentation. If they can't prove this is mine and the amount is correct, remove it.

[Your Name]`
  },

  'charge-off-dispute': {
    title: 'Charge-off Dispute Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Charged-Off Account

To Whom It May Concern,

I'm disputing this charged-off account:

Creditor: [Creditor Name]
Account Number: [Number]
Amount: $[Amount]
Date of Charge-off: [Date]

Issues with this account:
- [The balance is wrong / I paid this / The dates are incorrect / etc.]

A charge-off doesn't mean I agreed the amount was correct. Verify the original agreement, the payment history, and the final balance. If any of this can't be documented, remove it.

[Your Name]`
  },

  'paid-collection-removal': {
    title: 'Paid Collection Removal Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Request to Remove Paid Collection

To Whom It May Concern,

I paid this collection account on [Date]. Payment confirmation: [Reference number or check number].

The debt is settled. There's no reason to keep damaging my credit for something that's been resolved.

I'm asking you to delete this account from all three credit bureaus as a gesture of goodwill. I held up my end - I paid. Now I'm asking you to help me move forward.

If you agree, please send written confirmation and submit deletion requests to Equifax, Experian, and TransUnion.

[Your Name]`
  },

  'cease-desist': {
    title: 'Cease & Desist Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Cease All Communication

To Whom It May Concern,

I'm formally requesting that you stop all communication with me about this account.

Under the Fair Debt Collection Practices Act, once you receive this letter, you must stop contacting me except to:
- Confirm you're stopping contact
- Notify me of a specific action you're taking (like a lawsuit)

Do not call me. Do not write me. Do not contact my family, friends, or employer.

Any further contact beyond what's allowed by law will be documented and reported.

[Your Name]`
  },

  'pay-delete': {
    title: 'Pay for Delete Request Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Pay for Delete Offer

To Whom It May Concern,

I'm willing to pay this account if you agree to delete it from all credit bureaus.

Account Number: [Number]
Amount I'm Offering: $[Amount]

Terms:
1. You send written agreement BEFORE I pay
2. Agreement must state you will delete (not update to "paid")
3. Payment by certified funds within 10 days of receiving agreement
4. Deletion submitted to all three bureaus within 30 days of payment

This is a conditional offer. No payment without written deletion agreement first.

If you agree, send the agreement to the address above.

[Your Name]`
  },

  'sol-letter': {
    title: 'Statute of Limitations Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Debt Beyond Statute of Limitations

To Whom It May Concern,

This debt is past the statute of limitations for my state.

Original creditor: [Name]
Date of first delinquency: [Date]
Statute of limitations in [State]: [X] years
Time elapsed: [X] years

You can't sue me for this debt. It's time-barred.

Stop all collection activity immediately. Remove this from my credit reports. Any continued collection attempts on a time-barred debt may violate the FDCPA.

[Your Name]`
  },

  'reaging-dispute': {
    title: 'Re-aging/Re-dating Dispute Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor/Collection Agency Name]
[Address]
[City, State ZIP]

Re: Account Number [Account Number] - Illegal Re-aging of Debt

To Whom It May Concern,

You've changed the dates on this account to make it look newer than it is. That's not allowed.

Original date of first delinquency: [Correct Date]
Date you're now reporting: [Wrong Date]

The date a debt first went bad doesn't change when it gets sold to collections or transferred. You can't reset the clock to keep it on my report longer.

Prove the date you're reporting is the actual original delinquency date. If you can't, correct it immediately with all credit bureaus.

[Your Name]`
  },

  'settlement-offer': {
    title: 'Settlement Offer Letter',
    category: 'collections',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Settlement Offer

To Whom It May Concern,

I'm offering $[Amount] to settle this account. This is conditional on:

1. You send written acceptance on company letterhead BEFORE I pay
2. Payment by cashier's check/money order within 10 days of your acceptance
3. You delete this from all credit bureaus after payment, OR update to "Paid in Full"
4. This payment ends everything - no remaining balance, no selling to another collector

This is not me admitting I owe this. It's a business offer to make this go away.

Offer valid for 30 days. Respond in writing.

[Your Name]`
  },

  // ===========================================
  // DEBT COLLECTORS (FDCPA)
  // ===========================================
  'fdcpa-violation': {
    title: 'FDCPA Violation Notice',
    category: 'debt-collectors',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Notice of FDCPA Violations - Account [Account Number]

To Whom It May Concern,

You have violated the Fair Debt Collection Practices Act in your collection attempts:

Violation(s):
- [Called before 8am or after 9pm]
- [Called my workplace after being told not to]
- [Threatened action you can't legally take]
- [Used abusive or profane language]
- [Contacted me after receiving cease communication request]
- [Failed to validate debt when requested]
- [Misrepresented the amount owed]
- [Other: specify]

Date(s) of violation: [Date(s)]

I have documented these violations. Cease all improper collection activity immediately.

I'm considering filing complaints with the FTC, CFPB, and my state attorney general, as well as pursuing legal action for statutory damages.

[Your Name]`
  },

  'collector-dispute': {
    title: 'Direct Dispute to Collector',
    category: 'debt-collectors',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - I Dispute This Debt

To Whom It May Concern,

I'm disputing this debt. I don't believe I owe it, or the amount is wrong.

What you're claiming: $[Amount]
Why I'm disputing: [Not my debt / Wrong amount / Already paid / Statute of limitations expired / etc.]

Until you validate this debt with proper documentation, you must:
1. Stop all collection activity
2. Not report this to credit bureaus, or mark existing reports as "disputed"
3. Not sell or transfer this debt

Send validation or close your file.

[Your Name]`
  },

  'arbitration-demand': {
    title: 'Demand for Arbitration Letter',
    category: 'debt-collectors',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Demand for Arbitration

To Whom It May Concern,

I'm invoking my right to arbitration as provided in the original account agreement.

Stop all collection activity and litigation. This matter must be resolved through arbitration as specified in the cardholder agreement.

Provide confirmation within 15 days that you're initiating arbitration proceedings or withdrawing your collection efforts.

Any continued collection activity outside the arbitration process may violate the terms of the original agreement.

[Your Name]`
  },

  'cfpb-complaint': {
    title: 'CFPB Complaint Template',
    category: 'debt-collectors',
    content: `CONSUMER FINANCIAL PROTECTION BUREAU COMPLAINT

Date: [Date]
Consumer: [Your Name]

COMPANY BEING COMPLAINED ABOUT:
Company Name: [Company Name]
Account Number: [Account Number]

ISSUE TYPE: [Credit Reporting / Debt Collection / Other]

WHAT HAPPENED:
[Describe the issue in detail. Include dates, amounts, and what went wrong. Be specific but stick to facts.]

WHAT I'VE ALREADY DONE:
- Disputed with [company/bureau] on [date]
- Sent [type of letter] on [date]
- [Other steps taken]

WHAT I WANT:
[Delete inaccurate information / Stop collection calls / Correct account information / etc.]

SUPPORTING DOCUMENTS:
- [List documents you're attaching]

---
Submit at: consumerfinance.gov/complaint
Keep copies of everything.`
  },

  'intent-to-sue': {
    title: 'Intent to Sue Letter',
    category: 'debt-collectors',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Company Name]
[Company Address]
[City, State ZIP]

Re: Notice of Intent to File Lawsuit - Account [Account Number]

To Whom It May Concern,

This is formal notice that I intend to file a lawsuit against your company for violations of:

[Check applicable]
- Fair Credit Reporting Act (FCRA)
- Fair Debt Collection Practices Act (FDCPA)
- [State] Consumer Protection Laws

The violations include:
[List specific violations with dates]

I have documented evidence of these violations and have attempted to resolve this matter through normal channels without success.

You have 15 days to:
1. Correct all inaccurate information
2. Cease all improper collection activity
3. Provide written confirmation of compliance

If this matter is not resolved, I will pursue all available legal remedies, including statutory damages, actual damages, and attorney's fees.

[Your Name]`
  },

  'sol-defense': {
    title: 'Statute of Limitations Defense Letter',
    category: 'debt-collectors',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency/Law Firm Name]
[Address]
[City, State ZIP]

Re: Account [Account Number] - Statute of Limitations Defense

To Whom It May Concern,

You're attempting to collect or sue on a time-barred debt.

Facts:
- Original Creditor: [Name]
- Date of First Delinquency: [Date]
- State where debt was incurred: [State]
- Applicable statute of limitations: [X] years
- SOL expiration date: [Date]

This debt is beyond the statute of limitations. You cannot successfully sue me for it.

If you proceed with litigation, I will raise this as an affirmative defense and seek sanctions, attorney's fees, and damages for pursuing a time-barred claim.

Cease all collection and litigation activity immediately.

[Your Name]`
  },

  // ===========================================
  // DATA FURNISHERS
  // ===========================================
  'furnisher-dispute': {
    title: 'Direct Dispute to Furnisher',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Original Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account Number [Account Number] - Dispute of Information You're Reporting

To Whom It May Concern,

You're reporting information about my account to the credit bureaus that I believe is inaccurate:

Account: [Number]
What's wrong: [Describe the issue]

I'm disputing this directly with you. You're required to investigate and correct inaccurate information.

Prove what you're reporting is accurate. If you can't document that every detail is correct, fix it with all three credit bureaus immediately.

Respond within 30 days with the results of your investigation and how you verified the information.

[Your Name]`
  },

  'account-correction': {
    title: 'Account Information Correction Request',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account Number [Account Number] - Incorrect Information Being Reported

To Whom It May Concern,

The information you're reporting about my account isn't right:

What you're showing:
- [List incorrect items: balance, limit, status, dates, etc.]

What it should be:
- [List correct information]

Verify your records. If you can't prove your current reporting is accurate, correct it with all three credit bureaus within 30 days.

[Your Name]`
  },

  'billing-error': {
    title: 'Billing Error Dispute',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Bank/Credit Card Company Name]
Billing Department
[Address]
[City, State ZIP]

Re: Account Number [Account Number] - Billing Error

To Whom It May Concern,

There's an error on my account:

Transaction Date: [Date]
Amount: $[Amount]
Description: [Name/Description]

Why it's wrong: [I didn't authorize this / wrong amount / didn't receive item / charged twice / etc.]

Investigate this and credit my account. Don't charge me interest or fees on this disputed amount while you investigate. Don't report me as late on a disputed charge.

If you think this charge is valid, prove it. Show me documentation that I authorized this exact transaction.

[Your Name]`
  },

  'closed-account': {
    title: 'Closed Account Status Update Request',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account Number [Account Number] - Incorrect Closed Account Status

To Whom It May Concern,

My closed account is being reported incorrectly:

Currently showing: [Current incorrect status]
Should show: "Closed at Consumer's Request" or "Closed - Paid in Full"

I closed this account on [Date] on my own terms. The way it's showing now makes it look negative when it shouldn't.

Update your records and report the correct status to all three credit bureaus within 30 days. If you believe your current reporting is accurate, prove it.

[Your Name]`
  },

  'fcra-623-violation': {
    title: 'Furnisher Violation Notice (FCRA 623)',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account Number [Account Number] - Failure to Properly Investigate

To Whom It May Concern,

I disputed information about this account through the credit bureau on [Date]. You were notified and required to investigate. You didn't do your job.

What happened:
- I disputed on [Date]
- You "verified" without actually investigating
- The information is still wrong: [Explain what's wrong]
- My evidence showing it's wrong: [Describe your proof]

You can't just rubber-stamp disputes. You're required to actually investigate.

Fix this information with all credit bureaus now. If you still think your reporting is accurate, prove it - show me the documentation.

[Your Name]`
  },

  'fcra-violation': {
    title: 'FCRA 623 Violation Notice',
    category: 'furnishers',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor/Furnisher Name]
[Address]
[City, State ZIP]

Re: Account [Account Number] - Notice of FCRA Violations

To Whom It May Concern,

You are violating the Fair Credit Reporting Act in how you're handling my account:

Violation(s):
- [Reporting information you know is inaccurate]
- [Failing to investigate my dispute]
- [Continuing to report after I provided proof of error]
- [Not updating information after investigation]

Dates:
- My dispute submitted: [Date]
- Your response (or lack of): [Date/Description]

You're required to report accurate information and investigate disputes. You haven't done that.

Correct this immediately. If you continue to violate my rights, I'll file complaints with the CFPB and FTC, and consider legal action.

[Your Name]`
  },

  // ===========================================
  // LATE PAYMENTS
  // ===========================================
  'late-payment': {
    title: 'Late Payment Dispute Letter',
    category: 'late-payments',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Late Payment

To Whom It May Concern,

I'm disputing a late payment on my credit report:

Creditor: [Creditor Name]
Account Number: [Number]
Date(s) reported late: [Month/Year]

This is inaccurate because: [I was never late / Payment was made on time / Wrong date reported / etc.]

Verify this with the creditor. If they can't prove I was actually late on the specific date(s) shown, remove the late payment notation.

[Your Name]`
  },

  'first-time-late': {
    title: 'First-Time Late Payment Forgiveness',
    category: 'late-payments',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account [Account Number] - Request for Late Payment Removal

To Whom It May Concern,

I had my first late payment on this account:

Account Number: [Number]
Late Payment Date: [Month/Year]
Account Open Since: [Year]
Total Late Payments Ever: 1

This was my first late payment in [X] years as your customer. It was due to [brief reason - oversight, mail issue, autopay failure, etc.].

I've paid it and my account is now current.

I'm asking you to remove this one late payment as a courtesy. I've had a perfect history otherwise and want to keep it that way.

[Your Name]`
  },

  'hardship-removal': {
    title: 'Hardship-Based Removal Request',
    category: 'late-payments',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account [Account Number] - Hardship Goodwill Request

To Whom It May Concern,

I'm writing about negative information on my account that resulted from a hardship situation:

Account Number: [Number]
Negative Item: [Late payment / Collection / etc.]
Date: [When it occurred]

What happened: [Brief explanation - job loss, medical emergency, divorce, death in family, natural disaster, military deployment, etc.]

I've since [recovered / caught up / returned to good standing]. My account has been current since [Date].

I'm asking you to consider removing this negative mark as a one-time goodwill gesture given the circumstances. I've been a customer since [Year] and want to continue the relationship.

[Your Name]`
  },

  'covid-relief': {
    title: 'COVID-19 Relief Dispute Letter',
    category: 'late-payments',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor/Credit Bureau Name]
[Address]
[City, State ZIP]

Re: Account [Account Number] - COVID-19 Accommodation Reporting Error

To Whom It May Concern,

My account was in a COVID-19 hardship program, but it's being reported incorrectly:

Account: [Account Number]
Accommodation Period: [Start Date] to [End Date]
Accommodation Type: [Forbearance / Deferment / Modified payments]

The problem: [Being reported as delinquent / late payments showing / wrong status / etc.]

Under the CARES Act, if I was current before entering a COVID accommodation and made required payments during it, my account should be reported as current.

Correct the reporting to show [current status / no late payments] for the accommodation period.

[Your Name]`
  },

  // ===========================================
  // INQUIRIES
  // ===========================================
  'inquiry-dispute': {
    title: 'Hard Inquiry Dispute Letter',
    category: 'inquiries',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Unauthorized Hard Inquiry

To Whom It May Concern,

There's a hard inquiry on my report that I didn't authorize:

Company Name: [Company]
Date of Inquiry: [Date]

I never applied for credit with this company. I never gave permission for them to pull my credit report.

Remove this unauthorized inquiry immediately. Hard inquiries without proper authorization are inaccurate and should not appear on my report.

[Your Name]`
  },

  'unauthorized-inquiry': {
    title: 'Unauthorized Inquiry Dispute Letter',
    category: 'inquiries',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Unauthorized Hard Inquiry

To Whom It May Concern,

There's a hard inquiry on my report that I didn't authorize:

Company: [Company Name]
Date of Inquiry: [Date]

I never applied for credit with this company. I never gave them permission to pull my credit.

Remove this inquiry immediately. It's either fraud or they pulled my credit without proper authorization - either way, it shouldn't be there.

If you believe this inquiry was authorized, provide proof - a signed application or recorded consent.

[Your Name]`
  },

  'promotional-inquiry': {
    title: 'Promotional Inquiry Removal Request',
    category: 'inquiries',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Opt-Out of Promotional Inquiries

To Whom It May Concern,

I want to opt out of promotional and marketing inquiries on my credit report.

Remove my name from all prescreened offer lists. Stop allowing companies to pull my credit for marketing purposes.

This opt-out should be permanent.

Confirm in writing that my request has been processed.

[Your Name]`
  },

  'duplicate-inquiry': {
    title: 'Duplicate Inquiry Dispute Letter',
    category: 'inquiries',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Duplicate Inquiry Removal Request

To Whom It May Concern,

The same company appears multiple times as hard inquiries on my report:

Company: [Company Name]
Dates: [Date 1], [Date 2], [Date 3]

I only applied once. Multiple inquiries from the same application should be counted as one.

Remove the duplicate inquiries and keep only one. If you believe these were separate applications, prove it.

[Your Name]`
  },

  // ===========================================
  // IDENTITY THEFT
  // ===========================================
  'identity-theft': {
    title: 'Identity Theft Dispute Letter',
    category: 'identity-theft',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Identity Theft - Fraudulent Accounts

To Whom It May Concern,

I'm a victim of identity theft. The following account(s) on my credit report were opened fraudulently:

Account: [Creditor Name]
Account Number: [Number]
Date Opened: [Date]

I did not open this account or authorize anyone to open it in my name.

I'm attaching:
- FTC Identity Theft Report (Report Number: [Number])
- Copy of government-issued ID
- [Police report if available]

Block this information immediately and remove it from my credit report. Send me written confirmation of the actions taken.

[Your Name]`
  },

  'fraud-alert': {
    title: 'Fraud Alert Request Letter',
    category: 'identity-theft',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Fraud Alert

To Whom It May Concern,

I'm a victim of identity theft [or: I believe I may become a victim of identity theft].

Place an initial fraud alert on my credit file immediately. This alert should:
- Require verification before any new credit is opened in my name
- Stay on my file for one year
- Be shared with the other two credit bureaus

My contact information for verification:
Phone: [Your Phone]
Email: [Your Email]

Send me confirmation that the alert has been placed.

[Your Name]`
  },

  'credit-freeze': {
    title: 'Credit Freeze Request Letter',
    category: 'identity-theft',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Security Freeze

To Whom It May Concern,

Place a security freeze on my credit file immediately.

My information:
- Full Name: [Your Name]
- Date of Birth: [DOB]
- Social Security Number: [XXX-XX-####]
- Current Address: [Address]

I understand that:
- No new credit can be opened while the freeze is in place
- I can temporarily lift or permanently remove the freeze
- The freeze is free

Send me my PIN or password needed to manage this freeze.

[Your Name]`
  },

  'ftc-affidavit': {
    title: 'FTC Identity Theft Affidavit Guide',
    category: 'identity-theft',
    content: `FTC IDENTITY THEFT AFFIDAVIT - INSTRUCTIONS

The official FTC Identity Theft Affidavit is available at:
IdentityTheft.gov

BEFORE YOU START:
1. File a report at IdentityTheft.gov
2. Get your Identity Theft Report
3. File a police report (optional but recommended)

WHAT YOU'LL NEED:
- Government-issued ID
- Proof of address
- List of all fraudulent accounts
- Dates you discovered the fraud
- Any documentation of the fraud

AFTER COMPLETING:
Send copies to:
- All three credit bureaus
- Each company where fraud occurred
- Your local police (for police report)

Keep the original and all copies for your records.

IMPORTANT: Never send original documents. Always send copies.`
  },

  'fraudulent-account': {
    title: 'Fraudulent Account Dispute Letter',
    category: 'identity-theft',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Fraudulent Account - Identity Theft

To Whom It May Concern,

This account was opened by someone who stole my identity:

Account Name: [Creditor Name]
Account Number: [Number]
Date Opened: [Date]

I did not open this account. I did not authorize anyone to open it in my name. This is fraud.

I'm attaching:
- FTC Identity Theft Report
- [Police Report if available]
- Copy of my ID

Block this account immediately and remove it from my credit report. Investigate and do not allow the thief to continue using my information.

[Your Name]`
  },

  // ===========================================
  // MEDICAL
  // ===========================================
  'hipaa-validation': {
    title: 'HIPAA Validation Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Validation and HIPAA Compliance Required

To Whom It May Concern,

You're attempting to collect on what you claim is a medical debt. Before going any further, I need you to prove this is legitimate and that you've followed the law.

Provide the following:

1. Signed authorization from me allowing release of my medical information to you
2. Proof the original provider had my written consent to share my information
3. Complete documentation of what this debt is for
4. An itemized statement of all charges
5. Proof of your authority to collect this debt

Medical information is protected. If you obtained my information improperly or cannot prove compliance, you need to delete this account and stop all collection activity.

Do not contact me again until you've provided all requested documentation.

[Your Name]`
  },

  'medical-collection': {
    title: 'Medical Collection Dispute Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Medical Collection

To Whom It May Concern,

I'm disputing this medical collection on my credit report:

Collection Agency: [Agency Name]
Account Number: [Account Number]
Amount Claimed: $[Amount]

I'm requesting that you verify this is accurate and that it was reported properly. Please confirm:

1. That the collection agency validated this debt before reporting it
2. That all information (dates, amounts, account details) is accurate
3. That this wasn't paid by insurance or already settled

If you cannot verify every detail with documented proof, remove it from my report.

Send me the results of your investigation and the method of verification used.

[Your Name]`
  },

  'medical-billing-error': {
    title: 'Medical Billing Error Dispute Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Medical Provider/Hospital Name]
Billing Department
[Address]
[City, State ZIP]

Re: Patient Account [Account Number] - Billing Dispute

To Whom It May Concern,

There's an error with my medical bill:

Date of Service: [Date]
Amount Billed: $[Amount]
Amount I Should Owe: $[Amount]

The problem: [Describe - wrong amount, wrong procedure code, already paid by insurance, duplicate charge, service not received, etc.]

Please review this account and provide:
1. Itemized statement of all charges
2. Explanation of Benefits from insurance
3. Proof this amount is correct

Do not send this to collections while it's being disputed. Do not report it to credit bureaus until the dispute is resolved.

[Your Name]`
  },

  'insurance-payment-dispute': {
    title: 'Insurance Payment Dispute Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Medical Provider Name]
Billing Department
[Address]
[City, State ZIP]

Re: Account [Account Number] - Insurance Should Have Paid

To Whom It May Concern,

You're billing me for charges that my insurance should have covered:

Date of Service: [Date]
Amount You're Billing Me: $[Amount]
My Insurance: [Insurance Company Name]
Policy Number: [Number]

This should be covered because: [In-network provider / covered procedure / already met deductible / etc.]

Before billing me, you need to:
1. Verify you billed my insurance correctly
2. Appeal any denied claims
3. Provide explanation of why insurance didn't pay

Don't send me to collections for a billing error on your end.

[Your Name]`
  },

  'no-surprises-act': {
    title: 'No Surprises Act Dispute Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Medical Provider Name]
Billing Department
[Address]
[City, State ZIP]

Re: Surprise Medical Bill Dispute

To Whom It May Concern,

I received a surprise bill that violates the No Surprises Act:

Date of Service: [Date]
Facility: [Hospital/Facility Name]
Amount Billed: $[Amount]

This bill is improper because:
- I was treated at an in-network facility
- I didn't choose to see an out-of-network provider
- I wasn't given proper notice about out-of-network costs
- This was emergency care

Under the No Surprises Act, I'm only responsible for in-network cost-sharing amounts.

Adjust this bill to reflect what I would have paid for in-network care. If you believe this bill is correct, provide documentation showing I was properly notified and consented to out-of-network charges.

[Your Name]`
  },

  'medical-under-500': {
    title: 'Medical Debt Under $500 Removal Letter',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Removal of Medical Collection Under $500

To Whom It May Concern,

I'm requesting removal of this medical collection:

Collection Agency: [Name]
Original Provider: [Medical Provider]
Amount: $[Amount - under $500]

Under the current credit reporting rules, medical collections under $500 should not appear on credit reports.

Remove this account immediately as it shouldn't be reported.

[Your Name]`
  },

  'paid-medical-removal': {
    title: 'Paid Medical Debt Removal Request',
    category: 'medical',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Removal of Paid Medical Debt

To Whom It May Concern,

I'm requesting removal of this paid medical collection:

Collection Agency: [Name]
Account Number: [Number]
Amount: $[Amount]
Date Paid: [Date]

This medical debt has been paid in full. Under current credit reporting rules, paid medical debt should be removed from credit reports.

Remove this account immediately.

[Your Name]`
  },

  // ===========================================
  // BANKRUPTCY
  // ===========================================
  'bankruptcy-discharge': {
    title: 'Bankruptcy Discharge Dispute Letter',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Incorrect Reporting of Discharged Bankruptcy Debt

To Whom It May Concern,

The following account was discharged in my bankruptcy but is still being reported incorrectly:

Account: [Creditor Name]
Account Number: [Number]
Bankruptcy Case Number: [Case Number]
Discharge Date: [Date]

This account should show:
- Included in bankruptcy
- $0 balance
- Not past due or in collections

It's currently showing: [Current incorrect status]

I'm attaching my bankruptcy discharge papers. Correct this immediately.

[Your Name]`
  },

  'bankruptcy-date': {
    title: 'Bankruptcy Date Dispute Letter',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Incorrect Bankruptcy Date

To Whom It May Concern,

The dates on my bankruptcy are being reported incorrectly:

Bankruptcy Case Number: [Number]
Correct Filing Date: [Date]
Correct Discharge Date: [Date]

What you're showing: [Incorrect dates]

A Chapter 7 bankruptcy should be removed 10 years from the filing date. A Chapter 13 should be removed 7 years from the filing date.

Correct the dates immediately. [If applicable: Based on the correct dates, this bankruptcy should already be removed from my report.]

[Your Name]`
  },

  'chapter-7-early-removal': {
    title: 'Chapter 7 Early Removal Request',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Early Removal of Chapter 7 Bankruptcy

To Whom It May Concern,

My Chapter 7 bankruptcy is being reported incorrectly:

Case Number: [Number]
Court: [Bankruptcy Court Name]
Date Filed: [Date]
Date Discharged: [Date]

The issue: [Incorrect dates / wrong chapter type / duplicate entry / already past 10 years / etc.]

I'm requesting that you verify this information and correct any errors. If the reporting isn't accurate, remove it.

[Your Name]`
  },

  'duplicate-bankruptcy': {
    title: 'Duplicate Bankruptcy Entry Dispute',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Duplicate Bankruptcy Entries

To Whom It May Concern,

My bankruptcy is showing up multiple times on my credit report:

Entry 1: [Details]
Entry 2: [Details]
[Additional entries if applicable]

I only filed one bankruptcy. Case Number: [Number]

Remove all duplicate entries. Only one bankruptcy record should appear.

[Your Name]`
  },

  'post-bankruptcy-collection': {
    title: 'Post-Bankruptcy Collection Dispute',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account [Account Number] - Debt Discharged in Bankruptcy

To Whom It May Concern,

You're trying to collect a debt that was discharged in my bankruptcy:

Original Creditor: [Name]
Account Number: [Number]
Amount Claimed: $[Amount]

My bankruptcy:
Case Number: [Number]
Court: [Court Name]
Discharge Date: [Date]

This debt was legally discharged. You cannot collect it. Attempting to collect a discharged debt violates the bankruptcy discharge injunction.

Stop all collection activity immediately. Remove any credit reporting. Do not contact me about this debt again.

[Your Name]`
  },

  'reaffirmed-debt': {
    title: 'Reaffirmed Debt Status Correction',
    category: 'bankruptcy',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Creditor Name]
[Creditor Address]
[City, State ZIP]

Re: Account [Account Number] - Reaffirmed Debt Reporting

To Whom It May Concern,

I reaffirmed this debt during my bankruptcy, but it's being reported incorrectly:

Account Number: [Number]
Bankruptcy Case: [Number]
Reaffirmation Date: [Date]

Current incorrect reporting: [Describe - showing as included in bankruptcy, wrong status, etc.]

Should show: Active account with current payment history since reaffirmation.

I kept this account and have been paying as agreed. Update the reporting to reflect the true status of this reaffirmed account.

[Your Name]`
  },

  // ===========================================
  // PROCEDURAL
  // ===========================================
  'procedural-request': {
    title: 'Procedural Request Letter',
    category: 'procedural',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Request for Investigation Procedures

To Whom It May Concern,

I'm requesting information about how you handle disputes and verify information. I'm entitled to this under the FCRA.

Please provide:
1. Your written procedures for investigating disputes
2. How you determine if information is accurate
3. What documentation you require from furnishers
4. Your timeline for completing investigations
5. How you notify consumers of results

Send this within 15 days.

[Your Name]`
  }
};

/**
 * Bundle definitions - groups of related letters
 */
const bundles = [
  {
    id: 'initial-dispute-starter',
    name: 'Initial Dispute Starter Kit',
    slug: 'initial-dispute-starter-kit',
    description: 'Everything you need to start disputing errors on your credit report. Perfect for beginners.',
    value: '$47',
    category: 'starter',
    letterCount: 6,
    letters: [
      'general-dispute',
      'debt-validation',
      'credit-report-request',
      'dispute-results-followup',
      'method-of-verification',
      'procedural-request'
    ]
  },
  {
    id: 'debt-validation-power',
    name: 'Debt Validation Power Pack',
    slug: 'debt-validation-power-pack',
    description: 'Force collectors to prove they have the right to collect. Many can\'t.',
    value: '$47',
    category: 'collections',
    letterCount: 5,
    letters: [
      'debt-validation',
      'collector-dispute',
      'fdcpa-violation',
      'cease-desist',
      'sol-letter'
    ]
  },
  {
    id: 'collection-crusher',
    name: 'Collection Crusher Bundle',
    slug: 'collection-crusher-bundle',
    description: 'Comprehensive toolkit to fight collection accounts and get them removed.',
    value: '$67',
    category: 'collections',
    letterCount: 8,
    letters: [
      'collection-account-dispute',
      'charge-off-dispute',
      'paid-collection-removal',
      'debt-validation',
      'cease-desist',
      'pay-delete',
      'sol-letter',
      'reaging-dispute'
    ]
  },
  {
    id: 'goodwill-forgiveness',
    name: 'Goodwill & Forgiveness Pack',
    slug: 'goodwill-forgiveness-pack',
    description: 'Request removal of negative items through kindness and customer loyalty.',
    value: '$37',
    category: 'goodwill',
    letterCount: 4,
    letters: [
      'goodwill',
      'first-time-late',
      'hardship-removal',
      'paid-collection-removal'
    ]
  },
  {
    id: 'medical-debt-destroyer',
    name: 'Medical Debt Destroyer',
    slug: 'medical-debt-destroyer',
    description: 'Specialized letters for medical collections, HIPAA violations, and billing errors.',
    value: '$67',
    category: 'medical',
    letterCount: 8,
    letters: [
      'hipaa-validation',
      'medical-collection',
      'medical-billing-error',
      'insurance-payment-dispute',
      'no-surprises-act',
      'medical-under-500',
      'paid-medical-removal',
      'debt-validation'
    ]
  },
  {
    id: 'identity-theft-recovery',
    name: 'Identity Theft Recovery Kit',
    slug: 'identity-theft-recovery-kit',
    description: 'Everything you need to recover from identity theft and clean your credit.',
    value: '$57',
    category: 'identity-theft',
    letterCount: 5,
    letters: [
      'identity-theft',
      'fraud-alert',
      'credit-freeze',
      'ftc-affidavit',
      'fraudulent-account'
    ]
  },
  {
    id: 'inquiry-removal',
    name: 'Inquiry Removal Pack',
    slug: 'inquiry-removal-pack',
    description: 'Remove unauthorized hard inquiries dragging down your score.',
    value: '$37',
    category: 'inquiries',
    letterCount: 4,
    letters: [
      'inquiry-dispute',
      'unauthorized-inquiry',
      'promotional-inquiry',
      'duplicate-inquiry'
    ]
  },
  {
    id: 'bankruptcy-fresh-start',
    name: 'Bankruptcy Fresh Start',
    slug: 'bankruptcy-fresh-start',
    description: 'Clean up your credit after bankruptcy. Remove discharged debts still showing.',
    value: '$57',
    category: 'bankruptcy',
    letterCount: 6,
    letters: [
      'bankruptcy-discharge',
      'bankruptcy-date',
      'chapter-7-early-removal',
      'duplicate-bankruptcy',
      'post-bankruptcy-collection',
      'reaffirmed-debt'
    ]
  },
  {
    id: 'creditor-direct-attack',
    name: 'Creditor Direct Attack',
    slug: 'creditor-direct-attack',
    description: 'Dispute directly with creditors and furnishers for faster results.',
    value: '$47',
    category: 'furnishers',
    letterCount: 6,
    letters: [
      'furnisher-dispute',
      'account-correction',
      'billing-error',
      'closed-account',
      'fcra-623-violation',
      'fcra-violation'
    ]
  },
  {
    id: 'late-payment-removal',
    name: 'Late Payment Removal Kit',
    slug: 'late-payment-removal-kit',
    description: 'Remove late payments through disputes, goodwill, and hardship requests.',
    value: '$37',
    category: 'late-payments',
    letterCount: 4,
    letters: [
      'late-payment',
      'first-time-late',
      'hardship-removal',
      'covid-relief'
    ]
  },
  {
    id: 'legal-threat-arsenal',
    name: 'Legal Threat Arsenal',
    slug: 'legal-threat-arsenal',
    description: 'When normal disputes fail, escalate with legal notices and complaint templates.',
    value: '$67',
    category: 'advanced',
    letterCount: 4,
    letters: [
      'fdcpa-violation',
      'fcra-violation',
      'cfpb-complaint',
      'intent-to-sue'
    ]
  },
  {
    id: 'advanced-dispute-tactics',
    name: 'Advanced Dispute Tactics',
    slug: 'advanced-dispute-tactics',
    description: 'Next-level strategies when basic disputes don\'t work.',
    value: '$57',
    category: 'advanced',
    letterCount: 5,
    letters: [
      'method-of-verification',
      'procedural-request',
      'arbitration-demand',
      'sol-defense',
      'reaging-dispute'
    ]
  },
  {
    id: 'complete-bureau-bundle',
    name: 'Complete Bureau Bundle',
    slug: 'complete-bureau-bundle',
    description: 'All the letters you need to dispute with Equifax, Experian, and TransUnion.',
    value: '$47',
    category: 'bureaus',
    letterCount: 6,
    letters: [
      'general-dispute',
      'dispute-results-followup',
      'method-of-verification',
      'procedural-request',
      'credit-report-request',
      'fraud-alert'
    ]
  },
  {
    id: 'hardship-relief',
    name: 'Hardship & Relief Pack',
    slug: 'hardship-relief-pack',
    description: 'Letters for when life happened - job loss, medical issues, COVID, disasters.',
    value: '$37',
    category: 'hardship',
    letterCount: 4,
    letters: [
      'hardship-removal',
      'covid-relief',
      'goodwill',
      'first-time-late'
    ]
  },
  {
    id: 'statute-limitations',
    name: 'Statute of Limitations Kit',
    slug: 'statute-of-limitations-kit',
    description: 'Stop collectors from collecting on time-barred debts.',
    value: '$37',
    category: 'collections',
    letterCount: 3,
    letters: [
      'sol-letter',
      'sol-defense',
      'cease-desist'
    ]
  },
  {
    id: 'mega-bundle',
    name: 'MEGA BUNDLE - All 55 Letters',
    slug: 'mega-bundle-all-letters',
    description: 'Every single letter template we offer. The complete credit repair arsenal.',
    value: '$297',
    category: 'complete',
    letterCount: 55,
    letters: Object.keys(letterTemplates)
  }
];

/**
 * Bureau addresses for letter templates
 */
const bureauAddresses = {
  equifax: {
    name: 'Equifax',
    address: 'P.O. Box 740256',
    city: 'Atlanta',
    state: 'GA',
    zip: '30374'
  },
  experian: {
    name: 'Experian',
    address: 'P.O. Box 4500',
    city: 'Allen',
    state: 'TX',
    zip: '75013'
  },
  transunion: {
    name: 'TransUnion',
    address: 'P.O. Box 2000',
    city: 'Chester',
    state: 'PA',
    zip: '19016'
  }
};

module.exports = {
  letterTemplates,
  bundles,
  bureauAddresses
};
