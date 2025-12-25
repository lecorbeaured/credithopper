// ===========================================
// CREDITHOPPER - DATABASE SEED
// ===========================================
// Populates reference data: state laws, bureau addresses, letter templates

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ===========================================
  // STATE LAWS (Statute of Limitations)
  // ===========================================
  console.log('📋 Seeding state laws...');
  
  const stateLaws = [
    { stateCode: 'AL', stateName: 'Alabama', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 3 },
    { stateCode: 'AK', stateName: 'Alaska', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'AZ', stateName: 'Arizona', solWrittenContract: 6, solOralContract: 3, solPromissoryNote: 6, solOpenAccount: 3 },
    { stateCode: 'AR', stateName: 'Arkansas', solWrittenContract: 5, solOralContract: 3, solPromissoryNote: 5, solOpenAccount: 3 },
    { stateCode: 'CA', stateName: 'California', solWrittenContract: 4, solOralContract: 2, solPromissoryNote: 4, solOpenAccount: 4 },
    { stateCode: 'CO', stateName: 'Colorado', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'CT', stateName: 'Connecticut', solWrittenContract: 6, solOralContract: 3, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'DE', stateName: 'Delaware', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'FL', stateName: 'Florida', solWrittenContract: 5, solOralContract: 4, solPromissoryNote: 5, solOpenAccount: 4 },
    { stateCode: 'GA', stateName: 'Georgia', solWrittenContract: 6, solOralContract: 4, solPromissoryNote: 6, solOpenAccount: 4 },
    { stateCode: 'HI', stateName: 'Hawaii', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'ID', stateName: 'Idaho', solWrittenContract: 5, solOralContract: 4, solPromissoryNote: 5, solOpenAccount: 4 },
    { stateCode: 'IL', stateName: 'Illinois', solWrittenContract: 5, solOralContract: 5, solPromissoryNote: 5, solOpenAccount: 5 },
    { stateCode: 'IN', stateName: 'Indiana', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'IA', stateName: 'Iowa', solWrittenContract: 5, solOralContract: 5, solPromissoryNote: 5, solOpenAccount: 5 },
    { stateCode: 'KS', stateName: 'Kansas', solWrittenContract: 5, solOralContract: 3, solPromissoryNote: 5, solOpenAccount: 3 },
    { stateCode: 'KY', stateName: 'Kentucky', solWrittenContract: 5, solOralContract: 5, solPromissoryNote: 5, solOpenAccount: 5 },
    { stateCode: 'LA', stateName: 'Louisiana', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'ME', stateName: 'Maine', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'MD', stateName: 'Maryland', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'MA', stateName: 'Massachusetts', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'MI', stateName: 'Michigan', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'MN', stateName: 'Minnesota', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'MS', stateName: 'Mississippi', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'MO', stateName: 'Missouri', solWrittenContract: 5, solOralContract: 5, solPromissoryNote: 5, solOpenAccount: 5 },
    { stateCode: 'MT', stateName: 'Montana', solWrittenContract: 5, solOralContract: 5, solPromissoryNote: 5, solOpenAccount: 5 },
    { stateCode: 'NE', stateName: 'Nebraska', solWrittenContract: 5, solOralContract: 4, solPromissoryNote: 5, solOpenAccount: 4 },
    { stateCode: 'NV', stateName: 'Nevada', solWrittenContract: 6, solOralContract: 4, solPromissoryNote: 6, solOpenAccount: 4 },
    { stateCode: 'NH', stateName: 'New Hampshire', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'NJ', stateName: 'New Jersey', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'NM', stateName: 'New Mexico', solWrittenContract: 6, solOralContract: 4, solPromissoryNote: 6, solOpenAccount: 4 },
    { stateCode: 'NY', stateName: 'New York', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'NC', stateName: 'North Carolina', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'ND', stateName: 'North Dakota', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'OH', stateName: 'Ohio', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'OK', stateName: 'Oklahoma', solWrittenContract: 5, solOralContract: 3, solPromissoryNote: 5, solOpenAccount: 3 },
    { stateCode: 'OR', stateName: 'Oregon', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'PA', stateName: 'Pennsylvania', solWrittenContract: 4, solOralContract: 4, solPromissoryNote: 4, solOpenAccount: 4 },
    { stateCode: 'RI', stateName: 'Rhode Island', solWrittenContract: 10, solOralContract: 10, solPromissoryNote: 10, solOpenAccount: 10 },
    { stateCode: 'SC', stateName: 'South Carolina', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
    { stateCode: 'SD', stateName: 'South Dakota', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'TN', stateName: 'Tennessee', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'TX', stateName: 'Texas', solWrittenContract: 4, solOralContract: 4, solPromissoryNote: 4, solOpenAccount: 4 },
    { stateCode: 'UT', stateName: 'Utah', solWrittenContract: 6, solOralContract: 4, solPromissoryNote: 6, solOpenAccount: 4 },
    { stateCode: 'VT', stateName: 'Vermont', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'VA', stateName: 'Virginia', solWrittenContract: 5, solOralContract: 3, solPromissoryNote: 5, solOpenAccount: 3 },
    { stateCode: 'WA', stateName: 'Washington', solWrittenContract: 6, solOralContract: 3, solPromissoryNote: 6, solOpenAccount: 3 },
    { stateCode: 'WV', stateName: 'West Virginia', solWrittenContract: 10, solOralContract: 5, solPromissoryNote: 10, solOpenAccount: 5 },
    { stateCode: 'WI', stateName: 'Wisconsin', solWrittenContract: 6, solOralContract: 6, solPromissoryNote: 6, solOpenAccount: 6 },
    { stateCode: 'WY', stateName: 'Wyoming', solWrittenContract: 8, solOralContract: 8, solPromissoryNote: 8, solOpenAccount: 8 },
    { stateCode: 'DC', stateName: 'District of Columbia', solWrittenContract: 3, solOralContract: 3, solPromissoryNote: 3, solOpenAccount: 3 },
  ];

  for (const law of stateLaws) {
    await prisma.stateLaw.upsert({
      where: { stateCode: law.stateCode },
      update: law,
      create: law,
    });
  }
  console.log(`   ✅ ${stateLaws.length} state laws seeded\n`);

  // ===========================================
  // BUREAU ADDRESSES
  // ===========================================
  console.log('🏢 Seeding bureau addresses...');
  
  const bureauAddresses = [
    {
      bureau: 'EQUIFAX',
      disputeStreet: 'P.O. Box 740256',
      disputeCity: 'Atlanta',
      disputeState: 'GA',
      disputeZip: '30374-0256',
      onlineDisputeUrl: 'https://www.equifax.com/personal/credit-report-services/credit-dispute/',
      phone: '1-800-864-2978',
    },
    {
      bureau: 'EXPERIAN',
      disputeStreet: 'P.O. Box 4500',
      disputeCity: 'Allen',
      disputeState: 'TX',
      disputeZip: '75013',
      onlineDisputeUrl: 'https://www.experian.com/disputes/main.html',
      phone: '1-888-397-3742',
    },
    {
      bureau: 'TRANSUNION',
      disputeStreet: 'P.O. Box 2000',
      disputeCity: 'Chester',
      disputeState: 'PA',
      disputeZip: '19016',
      onlineDisputeUrl: 'https://www.transunion.com/credit-disputes/dispute-your-credit',
      phone: '1-800-916-8800',
    },
  ];

  for (const address of bureauAddresses) {
    await prisma.bureauAddress.upsert({
      where: { bureau: address.bureau },
      update: address,
      create: address,
    });
  }
  console.log(`   ✅ ${bureauAddresses.length} bureau addresses seeded\n`);

  // ===========================================
  // LETTER TEMPLATES
  // ===========================================
  console.log('📝 Seeding letter templates...');

  const templates = [
    // Initial Dispute - Bureau
    {
      name: 'Initial Dispute - Collection (Bureau)',
      description: 'First dispute letter for collection accounts sent to credit bureaus',
      category: 'INITIAL_DISPUTE',
      targetType: 'BUREAU',
      accountTypes: ['COLLECTION', 'MEDICAL'],
      round: 1,
      content: `{{current_date}}

{{bureau_name}}
{{bureau_address}}

Re: Dispute of Inaccurate Information
SSN: XXX-XX-{{ssn_last4}}

Dear Sir or Madam,

I am writing to dispute the following information that appears on my credit report. I do not recognize this account and believe it may be inaccurately reported.

Account in Question:
Creditor Name: {{creditor_name}}
Account Number: {{account_number}}
Reported Balance: {{balance}}

I do not recall having any business relationship with this creditor. Under the Fair Credit Reporting Act, Section 611 (15 U.S.C. § 1681i), I am requesting that you investigate this item and provide me with verification of:

1. The original creditor's name and address
2. The amount of the alleged debt at the time of default
3. Documentation proving I agreed to this debt
4. The date of first delinquency

If you cannot verify this information within 30 days, I request that this item be deleted from my credit report immediately.

Please send the results of your investigation to me at the address below:

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}`,
      variables: ['current_date', 'bureau_name', 'bureau_address', 'ssn_last4', 'creditor_name', 'account_number', 'balance', 'user_name', 'user_address'],
      phraseVariations: {
        greeting: ['Dear Sir or Madam,', 'To Whom It May Concern,', 'Dear Dispute Department,'],
        opening: [
          'I am writing to dispute the following information',
          'This letter is to formally dispute information',
          'I am disputing the accuracy of information'
        ],
        closing: ['Sincerely,', 'Respectfully,', 'Thank you for your attention to this matter,']
      },
      isActive: true,
      isPremium: false,
    },
    
    // Method of Verification - Bureau
    {
      name: 'Method of Verification Request (Bureau)',
      description: 'Round 2 letter demanding proof of verification procedure',
      category: 'METHOD_OF_VERIFICATION',
      targetType: 'BUREAU',
      accountTypes: ['COLLECTION', 'LATE_PAYMENT', 'CHARGE_OFF', 'MEDICAL'],
      round: 2,
      content: `{{current_date}}

{{bureau_name}}
{{bureau_address}}

Re: Request for Method of Verification
Previous Dispute Date: {{previous_dispute_date}}
SSN: XXX-XX-{{ssn_last4}}

Dear Sir or Madam,

On {{previous_dispute_date}}, I submitted a dispute regarding the account listed below. You responded that the account was "verified." However, under the Fair Credit Reporting Act, Section 611(a)(6)(B)(iii), you are required to provide me with a description of the procedure used to determine the accuracy of the disputed information.

Account in Question:
Creditor Name: {{creditor_name}}
Account Number: {{account_number}}

I am formally requesting:

1. The name, address, and telephone number of each person contacted regarding this account
2. A summary of the response received from the furnisher
3. Copies of any documentation used to verify this account
4. The specific procedure followed during your investigation

Simply stating "verified" does not fulfill your legal obligations under the FCRA. If you cannot provide the method of verification within 15 days, I request immediate deletion of this item per Section 611(a)(5)(A).

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}`,
      variables: ['current_date', 'bureau_name', 'bureau_address', 'previous_dispute_date', 'ssn_last4', 'creditor_name', 'account_number', 'user_name', 'user_address'],
      isActive: true,
      isPremium: false,
    },

    // Debt Validation - Furnisher
    {
      name: 'Debt Validation Letter (Collector)',
      description: 'FDCPA debt validation request sent to collection agency',
      category: 'DEBT_VALIDATION',
      targetType: 'FURNISHER',
      accountTypes: ['COLLECTION', 'MEDICAL'],
      round: 1,
      content: `{{current_date}}

{{furnisher_name}}
{{furnisher_address}}

Re: Debt Validation Request
Account Number: {{account_number}}
Alleged Amount: {{balance}}

Dear Sir or Madam,

I am writing in response to your reporting of the above-referenced account to the credit bureaus. I do not recognize this debt and am requesting validation pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g.

Please provide me with the following:

1. Verification of the amount claimed, including itemization of principal, interest, and fees
2. The name and address of the original creditor
3. A copy of any signed agreement or contract bearing my signature
4. Proof of your authority to collect this debt (chain of title documentation)
5. Proof that the statute of limitations has not expired
6. Your state collection license number

Under the FDCPA, you must cease all collection activity until you have provided this validation. Additionally, you must not report this debt to any credit bureau until validation is provided.

If you cannot validate this debt, I demand that you:
1. Cease all collection efforts immediately
2. Remove any negative reporting from all credit bureaus
3. Send written confirmation of the above actions

This is not a refusal to pay, but a request for validation as allowed by federal law.

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}`,
      variables: ['current_date', 'furnisher_name', 'furnisher_address', 'account_number', 'balance', 'user_name', 'user_address'],
      isActive: true,
      isPremium: false,
    },

    // Goodwill Letter
    {
      name: 'Goodwill Adjustment Request',
      description: 'Request for removal of late payment based on good payment history',
      category: 'GOODWILL',
      targetType: 'FURNISHER',
      accountTypes: ['LATE_PAYMENT', 'CREDIT_CARD', 'AUTO_LOAN', 'MORTGAGE', 'PERSONAL_LOAN'],
      round: 1,
      content: `{{current_date}}

{{furnisher_name}}
{{furnisher_address}}

Re: Goodwill Adjustment Request
Account Number: {{account_number}}
Customer Since: {{date_opened}}

Dear Customer Service Manager,

I am writing to request a goodwill adjustment to remove a late payment notation from my credit report with your company.

{{personal_context}}

I have been a loyal customer since {{date_opened}} and have otherwise maintained a positive payment history with your company. The late payment in question occurred due to {{reason}}, and I have since resolved the issue and brought my account current.

I understand that I was responsible for the late payment, and I am not disputing the accuracy of the reporting. However, I am asking for your consideration in removing this negative mark as a gesture of goodwill, given my overall positive relationship with your company.

This late payment is significantly impacting my credit score and my ability to {{credit_goal}}. Removing this item would greatly help me achieve this goal.

I value my relationship with {{creditor_name}} and hope you will consider this request. Thank you for your time and consideration.

{{user_name}}
{{user_address}}
Phone: {{user_phone}}

Sincerely,

{{user_name}}`,
      variables: ['current_date', 'furnisher_name', 'furnisher_address', 'account_number', 'date_opened', 'personal_context', 'reason', 'credit_goal', 'creditor_name', 'user_name', 'user_address', 'user_phone'],
      isActive: true,
      isPremium: true,
    },

    // FCRA Violation Warning
    {
      name: 'FCRA Violation Warning (Bureau)',
      description: 'Round 3 letter citing specific FCRA violations',
      category: 'PROCEDURAL_VIOLATION',
      targetType: 'BUREAU',
      accountTypes: ['COLLECTION', 'LATE_PAYMENT', 'CHARGE_OFF', 'MEDICAL', 'OTHER'],
      round: 3,
      content: `{{current_date}}

VIA CERTIFIED MAIL - RETURN RECEIPT REQUESTED

{{bureau_name}}
{{bureau_address}}

Re: Notice of FCRA Violations - Formal Demand
SSN: XXX-XX-{{ssn_last4}}
Previous Dispute Dates: {{dispute_history}}

Dear {{bureau_name}} Legal Department,

This letter serves as formal notice of your agency's violations of the Fair Credit Reporting Act regarding the account listed below, and my intent to pursue all available legal remedies if these violations are not immediately corrected.

Account in Question:
Creditor Name: {{creditor_name}}
Account Number: {{account_number}}

DOCUMENTED VIOLATIONS:

1. Failure to conduct reasonable investigation (15 U.S.C. § 1681i(a)(1)(A))
2. Failure to provide method of verification as requested (15 U.S.C. § 1681i(a)(6)(B)(iii))
3. Reporting of unverified information (15 U.S.C. § 1681e(b))

I have previously disputed this account on {{dispute_history}}. Your responses have failed to demonstrate any actual investigation or provide the verification documentation required by law.

DEMAND:

I demand that you:
1. Delete this account from my credit report within 10 business days
2. Provide written confirmation of deletion
3. Send corrected credit reports to any party who received my report in the past 6 months

NOTICE OF INTENT:

If you fail to comply with this demand, I will:
1. File a complaint with the Consumer Financial Protection Bureau
2. File a complaint with the Federal Trade Commission
3. Consult with an attorney regarding a civil action for willful non-compliance under 15 U.S.C. § 1681n, which provides for actual damages, statutory damages up to $1,000, punitive damages, and attorney's fees

This matter requires your immediate attention.

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}`,
      variables: ['current_date', 'bureau_name', 'bureau_address', 'ssn_last4', 'dispute_history', 'creditor_name', 'account_number', 'user_name', 'user_address'],
      isActive: true,
      isPremium: true,
    },

    // Identity Theft Dispute
    {
      name: 'Identity Theft Dispute (Bureau)',
      description: 'Dispute letter for fraudulent accounts due to identity theft',
      category: 'IDENTITY_THEFT',
      targetType: 'BUREAU',
      accountTypes: ['COLLECTION', 'CREDIT_CARD', 'AUTO_LOAN', 'PERSONAL_LOAN', 'OTHER'],
      round: 1,
      content: `{{current_date}}

{{bureau_name}}
{{bureau_address}}

Re: Identity Theft Dispute - Block Request Under FCRA Section 605B
SSN: XXX-XX-{{ssn_last4}}

Dear Sir or Madam,

I am a victim of identity theft and am writing to dispute fraudulent information on my credit report. I am requesting that you block this information pursuant to the Fair Credit Reporting Act, Section 605B (15 U.S.C. § 1681c-2).

Fraudulent Account:
Creditor Name: {{creditor_name}}
Account Number: {{account_number}}
Reported Balance: {{balance}}

I have never opened, authorized, or used this account. This account was opened fraudulently as a result of identity theft.

Enclosed please find:
1. Copy of my government-issued ID
2. Proof of current address
3. FTC Identity Theft Report (Affidavit)
4. Police report number: {{police_report_number}}

Under Section 605B, you must:
1. Block the fraudulent information within 4 business days
2. Notify the furnisher of the block
3. Not resell the blocked information

Please confirm in writing that this fraudulent account has been blocked and removed from my credit report.

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}

Enclosures: ID, proof of address, FTC affidavit`,
      variables: ['current_date', 'bureau_name', 'bureau_address', 'ssn_last4', 'creditor_name', 'account_number', 'balance', 'police_report_number', 'user_name', 'user_address'],
      isActive: true,
      isPremium: true,
    },
  ];

  for (const template of templates) {
    const existing = await prisma.letterTemplate.findFirst({
      where: { name: template.name },
    });

    if (!existing) {
      await prisma.letterTemplate.create({
        data: template,
      });
    } else {
      await prisma.letterTemplate.update({
        where: { id: existing.id },
        data: template,
      });
    }
  }
  console.log(`   ✅ ${templates.length} letter templates seeded\n`);

  // ===========================================
  // COMMON FURNISHERS
  // ===========================================
  console.log('🏦 Seeding common furnishers...');

  const furnishers = [
    { name: 'Portfolio Recovery Associates', furnisherType: 'COLLECTION_AGENCY', street: 'P.O. Box 12914', city: 'Norfolk', state: 'VA', zipCode: '23541' },
    { name: 'Midland Credit Management', furnisherType: 'DEBT_BUYER', street: 'P.O. Box 60578', city: 'Los Angeles', state: 'CA', zipCode: '90060' },
    { name: 'LVNV Funding', furnisherType: 'DEBT_BUYER', street: 'P.O. Box 25028', city: 'Greenville', state: 'SC', zipCode: '29616' },
    { name: 'Cavalry SPV I', furnisherType: 'DEBT_BUYER', street: 'P.O. Box 7389', city: 'Dublin', state: 'OH', zipCode: '43016' },
    { name: 'Jefferson Capital Systems', furnisherType: 'DEBT_BUYER', street: '16 Technology Drive', city: 'Irvine', state: 'CA', zipCode: '92618' },
    { name: 'Enhanced Recovery Company', furnisherType: 'COLLECTION_AGENCY', street: '8014 Bayberry Road', city: 'Jacksonville', state: 'FL', zipCode: '32256' },
    { name: 'IC System', furnisherType: 'COLLECTION_AGENCY', street: 'P.O. Box 64378', city: 'St. Paul', state: 'MN', zipCode: '55164' },
    { name: 'Convergent Outsourcing', furnisherType: 'COLLECTION_AGENCY', street: 'P.O. Box 8387', city: 'Renton', state: 'WA', zipCode: '98057' },
    { name: 'Radius Global Solutions', furnisherType: 'COLLECTION_AGENCY', street: '1650 Arch St Suite 2210', city: 'Philadelphia', state: 'PA', zipCode: '19103' },
    { name: 'Transworld Systems', furnisherType: 'COLLECTION_AGENCY', street: 'P.O. Box 9564', city: 'Allen', state: 'TX', zipCode: '75013' },
    { name: 'Credit Collection Services', furnisherType: 'COLLECTION_AGENCY', street: 'P.O. Box 5440', city: 'Watertown', state: 'MA', zipCode: '02471' },
    { name: 'Professional Finance Company', furnisherType: 'COLLECTION_AGENCY', street: '450 S Simms St Suite 200', city: 'Lakewood', state: 'CO', zipCode: '80228' },
    { name: 'CMRE Financial Services', furnisherType: 'COLLECTION_AGENCY', street: '333 City Blvd W Suite 1700', city: 'Orange', state: 'CA', zipCode: '92868' },
    { name: 'Alltran Financial', furnisherType: 'COLLECTION_AGENCY', street: '10825 Financial Centre Pkwy', city: 'Little Rock', state: 'AR', zipCode: '72211' },
    { name: 'National Credit Adjusters', furnisherType: 'DEBT_BUYER', street: 'P.O. Box 2007', city: 'Hutchinson', state: 'KS', zipCode: '67504' },
    { name: 'Resurgent Capital Services', furnisherType: 'DEBT_BUYER', street: 'P.O. Box 10587', city: 'Greenville', state: 'SC', zipCode: '29603' },
  ];

  for (const furnisher of furnishers) {
    const existing = await prisma.furnisher.findFirst({
      where: { name: furnisher.name },
    });

    if (!existing) {
      await prisma.furnisher.create({
        data: furnisher,
      });
    }
  }
  console.log(`   ✅ ${furnishers.length} furnishers seeded\n`);

  // ===========================================
  // LEGAL ESCALATION TEMPLATE (Round 4)
  // ===========================================
  console.log('📝 Adding Legal Escalation template...');
  
  const legalEscalation = {
    name: 'Legal Escalation / Intent to Litigate',
    description: 'Round 4 final demand letter citing willful FCRA violations and intent to pursue legal remedies',
    category: 'LEGAL_ESCALATION',
    targetType: 'BUREAU',
    accountTypes: ['COLLECTION', 'LATE_PAYMENT', 'CHARGE_OFF', 'MEDICAL', 'REPOSSESSION'],
    round: 4,
    content: `{{current_date}}

{{bureau_name}}
{{bureau_address}}

Re: FINAL DEMAND - Notice of Intent to Pursue Legal Remedies
SSN: XXX-XX-{{ssn_last4}}

SENT VIA CERTIFIED MAIL - RETURN RECEIPT REQUESTED

To Whom It May Concern:

This is my FOURTH dispute regarding the following account, which you continue to report despite my documented challenges to its accuracy:

Account in Question:
Creditor Name: {{creditor_name}}
Account Number: {{account_number}}
Reported Balance: {{balance}}

DOCUMENTED VIOLATIONS:

Over the past {{dispute_duration}}, I have sent {{dispute_count}} disputes regarding this account. Your handling of these disputes has violated the Fair Credit Reporting Act in the following ways:

1. FAILURE TO CONDUCT REASONABLE INVESTIGATION (15 U.S.C. § 1681i(a)(1))
   Your "verification" has consisted of nothing more than parroting back the same information without independent investigation.

2. FAILURE TO PROVIDE METHOD OF VERIFICATION (15 U.S.C. § 1681i(a)(6)(B)(iii))  
   Despite my requests, you have failed to provide the specific procedure used to verify this information.

3. WILLFUL NON-COMPLIANCE
   Your continued reporting of unverified information despite multiple disputes demonstrates willful disregard for my rights under the FCRA.

LEGAL REMEDIES:

Under FCRA Section 616 (15 U.S.C. § 1681n), I am entitled to:
- Actual damages suffered
- Statutory damages of $100 to $1,000 per violation
- Punitive damages for willful violations
- Attorney's fees and court costs

FINAL DEMAND:

You have FIFTEEN (15) days from receipt of this letter to:
1. Permanently delete the disputed account from my credit file
2. Provide written confirmation of deletion
3. Send corrected reports to all parties who received my report in the past 2 years

If I do not receive satisfactory resolution, I will:
1. File a formal complaint with the Consumer Financial Protection Bureau
2. File a complaint with the Federal Trade Commission
3. File a complaint with the {{state_attorney_general}} Attorney General's Office
4. Retain legal counsel to pursue all available remedies under federal and state law

This letter constitutes evidence of your willful non-compliance and will be submitted as part of any legal proceedings.

{{user_name}}
{{user_address}}

CC: Consumer Financial Protection Bureau
    Federal Trade Commission
    {{state_attorney_general}} Attorney General`,
    variables: ['current_date', 'bureau_name', 'bureau_address', 'ssn_last4', 'creditor_name', 'account_number', 'balance', 'dispute_duration', 'dispute_count', 'state_attorney_general', 'user_name', 'user_address'],
    phraseVariations: {},
    isActive: true,
    isPremium: true,
  };

  const existingLegal = await prisma.letterTemplate.findFirst({
    where: { name: legalEscalation.name },
  });

  if (!existingLegal) {
    await prisma.letterTemplate.create({
      data: legalEscalation,
    });
    console.log('   ✅ Legal Escalation template added\n');
  } else {
    console.log('   ⏭️ Legal Escalation template already exists\n');
  }

  // ===========================================
  // PAY FOR DELETE TEMPLATE
  // ===========================================
  console.log('📝 Adding Pay for Delete template...');
  
  const payForDelete = {
    name: 'Pay for Delete Offer',
    description: 'Settlement offer conditioned on complete removal from credit reports',
    category: 'PAY_FOR_DELETE',
    targetType: 'FURNISHER',
    accountTypes: ['COLLECTION', 'MEDICAL', 'CHARGE_OFF'],
    round: 1,
    content: `{{current_date}}

{{furnisher_name}}
{{furnisher_address}}

Re: Settlement Offer - Conditional on Deletion
Account Reference: {{account_number}}
Original Creditor: {{original_creditor}}
Amount Claimed: {{balance}}

To Whom It May Concern:

I am writing regarding the above-referenced account. I am prepared to resolve this matter under the following conditions:

SETTLEMENT OFFER:

I will pay ${{settlement_amount}} as full and final settlement of this account, CONDITIONED UPON your written agreement to:

1. Accept this amount as payment in full satisfaction of the alleged debt
2. Request deletion of this account from Equifax, Experian, and TransUnion within 30 days of payment
3. Report the account as "Paid in Full" or "Settled" if deletion is not possible
4. Not sell, assign, or transfer this debt to any other party
5. Provide a paid-in-full letter upon receipt of payment

TERMS:

- This offer is valid for 15 days from the date of this letter
- Payment will be made within 5 business days of receiving your signed acceptance
- Payment method: {{payment_method}}
- This offer is contingent upon receiving written acceptance on your company letterhead, signed by an authorized representative

This letter is not an acknowledgment of the validity of this debt. I am exercising my rights under consumer protection laws to negotiate a resolution.

If you agree to these terms, please sign below and return a copy to me. If you cannot agree, please consider this matter disputed and provide debt validation as required under the FDCPA.

Please respond in writing to:

{{user_name}}
{{user_address}}

Sincerely,

{{user_name}}

---
ACCEPTANCE (For Collection Agency Use):

I, _________________, am authorized to accept this settlement offer on behalf of {{furnisher_name}}.

We agree to the terms stated above.

Signature: _________________________
Print Name: _________________________
Title: _________________________
Date: _________________________`,
    variables: ['current_date', 'furnisher_name', 'furnisher_address', 'account_number', 'original_creditor', 'balance', 'settlement_amount', 'payment_method', 'user_name', 'user_address'],
    phraseVariations: {},
    isActive: true,
    isPremium: false,
  };

  const existingPFD = await prisma.letterTemplate.findFirst({
    where: { name: payForDelete.name },
  });

  if (!existingPFD) {
    await prisma.letterTemplate.create({
      data: payForDelete,
    });
    console.log('   ✅ Pay for Delete template added\n');
  } else {
    console.log('   ⏭️ Pay for Delete template already exists\n');
  }

  console.log('✅ Database seeding completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
