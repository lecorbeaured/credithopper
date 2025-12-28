/* ============================================
   CREDITHOPPER - BUNDLES PAGE JS
   Section 3: Letter bundles functionality
   ============================================ */

// API base URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';

// Current bundle for download
let currentDownloadBundle = null;

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initFilters();
  initCategoryNav();
  initMobileMenu();
  loadBundles();
});

/* ============================================
   LOAD BUNDLES FROM API
   ============================================ */
async function loadBundles() {
  const bundlesGrid = document.getElementById('bundlesGrid');
  if (!bundlesGrid) return;
  
  try {
    const response = await fetch(`${API_BASE}/bundles`);
    const data = await response.json();
    
    if (data.success && data.data.bundles) {
      renderBundles(data.data.bundles);
    } else {
      // Fallback to static bundles if API fails
      renderStaticBundles();
    }
  } catch (err) {
    console.error('Failed to load bundles:', err);
    renderStaticBundles();
  }
}

function renderBundles(bundles) {
  const bundlesGrid = document.getElementById('bundlesGrid');
  if (!bundlesGrid) return;
  
  // Find mega bundle for featured position
  const megaBundle = bundles.find(b => b.id === 'mega-bundle');
  const otherBundles = bundles.filter(b => b.id !== 'mega-bundle');
  
  let html = '';
  
  // Mega bundle first (featured)
  if (megaBundle) {
    html += renderBundleCard(megaBundle, true);
  }
  
  // Other bundles
  otherBundles.forEach(bundle => {
    html += renderBundleCard(bundle, false);
  });
  
  bundlesGrid.innerHTML = html;
  
  // Reinitialize icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function renderBundleCard(bundle, featured = false) {
  const iconMap = {
    'initial-dispute-starter': 'file-text',
    'debt-validation-power': 'shield-check',
    'collection-crusher': 'hammer',
    'goodwill-forgiveness': 'heart',
    'medical-debt-destroyer': 'heart-pulse',
    'identity-theft-recovery': 'fingerprint',
    'inquiry-removal': 'search',
    'bankruptcy-fresh-start': 'refresh-cw',
    'creditor-direct-attack': 'target',
    'late-payment-removal': 'clock',
    'legal-threat-arsenal': 'scale',
    'advanced-dispute-tactics': 'zap',
    'complete-bureau-bundle': 'building',
    'hardship-relief': 'umbrella',
    'statute-limitations': 'timer',
    'mega-bundle': 'package'
  };
  
  const icon = iconMap[bundle.id] || 'file-text';
  
  return `
    <div class="bundle-card ${featured ? 'featured' : ''}" data-bundle-id="${bundle.id}">
      <div class="bundle-card-header">
        <div class="bundle-card-icon">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="bundle-card-value">
          <span class="original">${bundle.value}</span>
          <span class="free">FREE</span>
        </div>
      </div>
      <h3>${bundle.name}</h3>
      <p>${bundle.description}</p>
      <div class="bundle-card-meta">
        <span><i data-lucide="file-text"></i> ${bundle.letterCount} letters</span>
        <span><i data-lucide="download"></i> PDF</span>
      </div>
      <button onclick="openBundleDownloadModal('${bundle.slug || bundle.id}')" class="btn ${featured ? 'btn-primary' : 'btn-outline'}">
        <i data-lucide="download" style="width: 16px; height: 16px;"></i>
        Download Free
      </button>
    </div>
  `;
}

function renderStaticBundles() {
  // Fallback static bundles if API fails
  const staticBundles = [
    { id: 'mega-bundle', name: 'MEGA BUNDLE - All 55 Letters', description: 'Every single letter template we offer. The complete credit repair arsenal.', value: 'Free', letterCount: 55, slug: 'mega-bundle-all-letters' },
    { id: 'initial-dispute-starter', name: 'Initial Dispute Starter Kit', description: 'Everything you need to start disputing errors.', value: 'Free', letterCount: 6, slug: 'initial-dispute-starter-kit' },
    { id: 'collection-crusher', name: 'Collection Crusher Bundle', description: 'Fight collection accounts and get them removed.', value: 'Free', letterCount: 8, slug: 'collection-crusher-bundle' },
    { id: 'medical-debt-destroyer', name: 'Medical Debt Destroyer', description: 'Specialized letters for medical collections.', value: 'Free', letterCount: 8, slug: 'medical-debt-destroyer' },
    { id: 'identity-theft-recovery', name: 'Identity Theft Recovery Kit', description: 'Recover from identity theft and clean your credit.', value: 'Free', letterCount: 5, slug: 'identity-theft-recovery-kit' },
    { id: 'bankruptcy-fresh-start', name: 'Bankruptcy Fresh Start', description: 'Clean up your credit after bankruptcy.', value: 'Free', letterCount: 6, slug: 'bankruptcy-fresh-start' }
  ];
  
  renderBundles(staticBundles);
}

/* ============================================
   BUNDLE DOWNLOAD MODAL
   ============================================ */
window.openBundleDownloadModal = function(bundleSlug) {
  currentDownloadBundle = bundleSlug;
  
  const modal = document.getElementById('bundleDownloadModal');
  const form = document.getElementById('bundleEmailForm');
  const success = document.getElementById('bundleDownloadSuccess');
  
  if (!modal) return;
  
  // Reset to form state
  if (form) form.style.display = 'block';
  if (success) success.style.display = 'none';
  
  // Update modal content based on bundle
  updateBundleModalContent(bundleSlug);
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus email input
  setTimeout(() => {
    const emailInput = document.getElementById('bundleEmail');
    if (emailInput) emailInput.focus();
  }, 100);
};

async function updateBundleModalContent(bundleSlug) {
  const titleEl = document.getElementById('bundleModalTitle');
  const nameEl = document.getElementById('bundleInfoName');
  const metaEl = document.getElementById('bundleInfoMeta');
  
  // Try to fetch bundle details
  try {
    const response = await fetch(`${API_BASE}/bundles/${bundleSlug}`);
    const data = await response.json();
    
    if (data.success && data.data.bundle) {
      const bundle = data.data.bundle;
      if (titleEl) titleEl.textContent = `Download ${bundle.name}`;
      if (nameEl) nameEl.textContent = bundle.name;
      if (metaEl) metaEl.textContent = `${bundle.letterCount} letters • ${bundle.value} value`;
    }
  } catch (err) {
    // Use default text
    if (titleEl) titleEl.textContent = 'Download Letter Bundle';
  }
}

window.handleBundleDownload = async function(event) {
  event.preventDefault();
  
  const email = document.getElementById('bundleEmail')?.value;
  const firstName = document.getElementById('bundleFirstName')?.value;
  const submitBtn = document.getElementById('bundleSubmitBtn');
  
  if (!email || !currentDownloadBundle) return;
  
  // Show loading
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Processing...';
  }
  
  try {
    // Request bundle (captures lead)
    const response = await fetch(`${API_BASE}/bundles/${currentDownloadBundle}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success state
      showDownloadSuccess(data.data.downloadUrl);
    } else {
      throw new Error(data.error || 'Failed to process request');
    }
  } catch (err) {
    console.error('Download request failed:', err);
    
    // Fallback: direct download with email param
    const downloadUrl = `${API_BASE}/bundles/${currentDownloadBundle}/download?email=${encodeURIComponent(email)}`;
    showDownloadSuccess(downloadUrl);
  }
  
  // Reset button
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="download" style="width: 18px; height: 18px;"></i><span>Get Free Download</span>';
  }
};

function showDownloadSuccess(downloadUrl) {
  const form = document.getElementById('bundleEmailForm');
  const success = document.getElementById('bundleDownloadSuccess');
  const downloadLink = document.getElementById('bundleDownloadLink');
  
  if (form) form.style.display = 'none';
  if (success) success.style.display = 'block';
  if (downloadLink) {
    downloadLink.href = downloadUrl;
    downloadLink.onclick = function() {
      // Track download click
      console.log('Download started:', downloadUrl);
    };
  }
  
  // Reinit icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/* ============================================
   MODAL HELPERS
   ============================================ */
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

/* ============================================
   SEARCH FUNCTIONALITY
   ============================================ */
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  let debounceTimer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterLetters();
    }, 200);
  });
}

/* ============================================
   FILTER FUNCTIONALITY
   ============================================ */
function initFilters() {
  const difficultyFilter = document.getElementById('difficultyFilter');
  
  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', filterLetters);
  }
}

function filterLetters() {
  const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const difficultyFilter = document.getElementById('difficultyFilter')?.value || '';
  
  const letterCards = document.querySelectorAll('.letter-card');
  const categories = document.querySelectorAll('.bundle-category');
  
  let visibleCount = 0;
  
  letterCards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const description = card.querySelector('p')?.textContent.toLowerCase() || '';
    const difficulty = card.dataset.difficulty || '';
    
    const matchesSearch = !searchQuery || 
      title.includes(searchQuery) || 
      description.includes(searchQuery);
    
    const matchesDifficulty = !difficultyFilter || difficulty === difficultyFilter;
    
    if (matchesSearch && matchesDifficulty) {
      card.classList.remove('hidden');
      visibleCount++;
    } else {
      card.classList.add('hidden');
    }
  });
  
  // Show/hide categories based on visible cards
  categories.forEach(category => {
    const visibleCards = category.querySelectorAll('.letter-card:not(.hidden)');
    if (visibleCards.length === 0) {
      category.classList.add('hidden');
    } else {
      category.classList.remove('hidden');
    }
  });
  
  // Update results count
  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = visibleCount;
  }
  
  // Show no results message if needed
  handleNoResults(visibleCount);
}

function handleNoResults(count) {
  const content = document.querySelector('.bundles-content');
  let noResults = document.querySelector('.no-results');
  
  if (count === 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerHTML = `
        <i data-lucide="search-x"></i>
        <h3>No letters found</h3>
        <p>Try adjusting your search or filters</p>
      `;
      content.appendChild(noResults);
      lucide.createIcons();
    }
    noResults.style.display = 'block';
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

/* ============================================
   CATEGORY NAVIGATION
   ============================================ */
function initCategoryNav() {
  const categoryLinks = document.querySelectorAll('.category-link');
  
  categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      categoryLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Scroll to category
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Update active category on scroll
  const categories = document.querySelectorAll('.bundle-category');
  
  const observerOptions = {
    rootMargin: '-100px 0px -50% 0px',
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const categoryId = entry.target.id;
        categoryLinks.forEach(link => {
          if (link.getAttribute('href') === `#${categoryId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);
  
  categories.forEach(category => observer.observe(category));
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenu');
  
  if (!toggle || !menu) return;
  
  const menuIcon = toggle.querySelector('.menu-icon');
  const closeIcon = toggle.querySelector('.close-icon');
  
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('active');
    
    if (menuIcon && closeIcon) {
      menuIcon.classList.toggle('hidden', isOpen);
      closeIcon.classList.toggle('hidden', !isOpen);
    }
  });

  // Close on link click
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
      if (menuIcon && closeIcon) {
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      }
    });
  });
}

/* ============================================
   LETTER MODAL
   ============================================ */
const letterTemplates = {
  'general-dispute': {
    title: 'General Dispute Letter',
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
  'hipaa-validation': {
    title: 'HIPAA Validation Letter',
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
  'bankruptcy-discharge': {
    title: 'Bankruptcy Discharge Dispute Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Accounts Not Properly Showing Bankruptcy Discharge

To Whom It May Concern,

The following accounts were discharged in my bankruptcy but are not being reported correctly:

Case Number: [Case Number]
Court: [Bankruptcy Court Name]
Discharge Date: [Date]

Accounts that need to be updated:
1. [Creditor Name] - Account ending in [last 4 digits]
2. [Creditor Name] - Account ending in [last 4 digits]

These accounts must show $0 balance and reflect that they were included in bankruptcy. Showing any balance owed or active collection status is inaccurate.

Verify with the bankruptcy court if needed. If the creditors cannot prove I still owe money on discharged debts, update these accounts immediately.

[Your Name]`
  },
  'bankruptcy-date': {
    title: 'Bankruptcy Date Dispute Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Incorrect Bankruptcy Dates

To Whom It May Concern,

The dates on my bankruptcy record are wrong, which affects when it should be removed from my report.

What's showing:
- Filing Date: [Wrong Date]
- Discharge Date: [Wrong Date]

Correct dates (verify with the court):
- Filing Date: [Correct Date]
- Discharge Date: [Correct Date]
- Case Number: [Case Number]
- Court: [Court Name]

Contact the bankruptcy court to verify. If you cannot prove your dates are accurate, correct them immediately.

[Your Name]`
  },
  'medical-paid': {
    title: 'Paid Medical Debt Removal Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Removal of Paid Medical Collection

To Whom It May Concern,

I'm disputing this medical collection because it has been paid:

Collection Agency: [Agency Name]
Account Number: [Number]
Original Amount: $[Amount]

Paid medical collections should not remain on credit reports. Verify with the collection agency whether this has been paid. If they cannot prove there's still an outstanding balance, remove this account.

[Your Name]`
  },
  'inquiry-dispute': {
    title: 'Hard Inquiry Dispute Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Unauthorized Inquiry - Remove Immediately

To Whom It May Concern,

There's an inquiry on my report that I did not authorize:

Company: [Company that made inquiry]
Date: [Date]

I did not apply for credit with this company. They had no right to access my report.

Contact them and demand they provide my signed authorization. If they cannot produce documented proof that I authorized this inquiry, remove it from my report immediately.

[Your Name]`
  },
  'late-payment': {
    title: 'Late Payment Dispute Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Dispute of Late Payment

To Whom It May Concern,

I'm disputing this late payment:

Creditor: [Creditor]
Account Number: [Number]
Date Showing Late: [Month/Year]

I don't believe this is accurate. Please verify with the creditor that:
1. The payment was actually received late
2. They have documentation proving the payment date
3. The late payment was reported within proper timeframes

If they cannot provide documented proof of exactly when payment was received, remove this late payment notation from my report.

[Your Name]`
  },
  'identity-theft': {
    title: 'Identity Theft Dispute Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Credit Bureau Name]
[Bureau Address]
[City, State ZIP]

Re: Fraudulent Account - Identity Theft

To Whom It May Concern,

This account was opened by someone who stole my identity. I did not open it:

Account Name: [Creditor]
Account Number: [Number]
Date Opened: [Date]
Balance: $[Amount]

I've filed reports:
- FTC Report Number: [Number]
- Police Report Number: [Number]

I am demanding you block this fraudulent account immediately. Contact the creditor and require them to prove I opened this account - they won't be able to because I didn't.

Do not make me responsible for proving I didn't open this. Make THEM prove I did. If they can't produce a signed application or agreement with my real signature, remove it.

[Your Name]`
  },
  // Debt Collector Letters
  'cease-desist': {
    title: 'Cease & Desist Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Stop All Contact

To Whom It May Concern,

Stop contacting me about this account. No more calls, letters, texts, or any other communication.

You may only contact me to confirm you're stopping collection efforts or to notify me of a specific legal action you're actually taking.

This is not me saying I owe anything. I'm exercising my right to make you stop contacting me.

I'm sending this certified mail so there's proof you received it.

[Your Name]`
  },
  'pay-delete': {
    title: 'Pay for Delete Request Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Settlement Proposal

To Whom It May Concern,

I'm willing to pay $[Settlement Amount] to resolve the account above, but only under these conditions:

1. You agree IN WRITING to delete this account from all three credit bureaus
2. You send me your written agreement BEFORE I send any payment
3. Payment will be by cashier's check or money order only
4. Once paid, this is done - no selling any "remaining balance" to anyone else

If you agree, sign below and return this letter. Once I receive your signed agreement, I'll send payment within 10 days.

This offer expires in 30 days.

[Your Name]

---
AGREED:

Signature: _______________________________

Print Name: _______________________________

Title: _______________________________

Date: _______________________________`
  },
  'fdcpa-violation': {
    title: 'FDCPA Violation Notice',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Collection Violations

To Whom It May Concern,

Your collection practices on this account have violated my rights. Here's what you did:

[Check what applies:]
- Called before 8am or after 9pm
- Kept calling after I requested validation
- Called my workplace after I said not to
- Talked to other people about my debt
- Threatened things you can't legally do
- Were abusive or harassing
- Didn't send validation within 5 days of first contact

I have records of these violations including [dates, times, recordings, letters].

Here's what happens now:
1. Stop all collection activity on this account
2. Delete this from all credit bureaus
3. Send written confirmation within 15 days

If you don't comply, I'll pursue every remedy available to me.

[Your Name]`
  },
  'sol-defense': {
    title: 'Statute of Limitations Defense Letter',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - Time-Barred Debt

To Whom It May Concern,

This debt is too old to collect through the courts:

- Original Creditor: [Name]
- Last Activity: [Date]
- Statute of Limitations in [State]: [X] years
- Time Limit Expired: [Date]

You cannot sue me for this debt. You cannot threaten to sue me. If you claim otherwise, prove it - show me documentation that the statute of limitations hasn't expired.

Stop all collection activity on this account.

[Your Name]`
  },
  'collector-dispute': {
    title: 'Direct Dispute to Collector',
    content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Collection Agency Name]
[Agency Address]
[City, State ZIP]

Re: Account Number [Account Number] - I Dispute This Debt

To Whom It May Concern,

I dispute this debt. The burden is on you to prove it's valid, accurate, and that you have the right to collect it.

Until you provide verification, you must:
1. Stop all collection activity
2. Stop reporting to credit bureaus, or mark it as disputed
3. Not sell or transfer this account

Send me documented proof of:
- The original debt agreement with my signature
- Complete payment history
- Your legal right to collect this
- That the amount is accurate

If you can't prove it, delete it and close your file.

[Your Name]`
  },
  'settlement-offer': {
    title: 'Settlement Offer Letter',
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
  // Data Furnisher Letters
  'furnisher-dispute': {
    title: 'Direct Dispute to Furnisher',
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
  'reaging-dispute': {
    title: 'Re-aging/Re-dating Dispute Letter',
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
  'closed-account': {
    title: 'Closed Account Status Update Request',
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
    title: 'Furnisher Violation Notice',
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

  // ===========================================
  // ADDITIONAL TEMPLATES - BASICS
  // ===========================================

  'credit-report-request': {
    title: 'Credit Report Request Letter',
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

  'procedural-request': {
    title: 'Procedural Request Letter',
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
  },

  // ===========================================
  // COLLECTIONS - ADDITIONAL
  // ===========================================

  'collection-account-dispute': {
    title: 'Collection Account Dispute Letter',
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

  'sol-letter': {
    title: 'Statute of Limitations Letter',
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

  // ===========================================
  // DEBT COLLECTORS - ADDITIONAL
  // ===========================================

  'arbitration-demand': {
    title: 'Demand for Arbitration Letter',
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

  // ===========================================
  // INQUIRIES - ADDITIONAL
  // ===========================================

  'unauthorized-inquiry': {
    title: 'Unauthorized Inquiry Dispute Letter',
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
  // IDENTITY THEFT - ADDITIONAL
  // ===========================================

  'fraud-alert': {
    title: 'Fraud Alert Request Letter',
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
  // MEDICAL - ADDITIONAL
  // ===========================================

  'medical-billing-error': {
    title: 'Medical Billing Error Dispute Letter',
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
  // BANKRUPTCY - ADDITIONAL
  // ===========================================

  'chapter-7-early-removal': {
    title: 'Chapter 7 Early Removal Request',
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
  // ADVANCED/SPECIAL SITUATIONS
  // ===========================================

  'hardship-removal': {
    title: 'Hardship-Based Removal Request',
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

  'first-time-late': {
    title: 'First-Time Late Payment Forgiveness',
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

  'fcra-violation': {
    title: 'FCRA 623 Violation Notice',
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
  }
};

// Default template for letters not in the database
const defaultTemplate = {
  title: 'Dispute Letter Template',
  content: `[Your Name]
[Your Address]
[City, State ZIP]
[Date]

[Recipient Name]
[Recipient Address]
[City, State ZIP]

Re: [Subject]

To Whom It May Concern,

I'm disputing the following information: [Describe what you're disputing]

The burden is on you to prove this is accurate. Please provide documentation verifying every detail.

If you cannot prove this information is 100% accurate and complete, correct or remove it immediately.

Respond within 30 days.

[Your Name]`
};

window.openLetterModal = function(letterId) {
  const modal = document.getElementById('letterModal');
  const titleEl = document.getElementById('modalLetterTitle');
  const contentEl = document.getElementById('letterPreviewContent');
  
  if (!modal) {
    console.error('Letter modal not found');
    return;
  }
  
  const template = letterTemplates[letterId] || defaultTemplate;
  
  // Show skeleton loading first
  if (titleEl) {
    titleEl.textContent = 'Loading...';
  }
  
  if (contentEl) {
    contentEl.innerHTML = window.SkeletonLoader ? window.SkeletonLoader.letterPreview() : '<p>Loading...</p>';
  }
  
  // Open modal - add active class directly
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Simulate brief loading for smooth transition
  setTimeout(() => {
    if (titleEl) {
      titleEl.textContent = template.title;
    }
    
    if (contentEl) {
      // Show only first 8 lines as preview (teaser)
      const lines = template.content.split('\n');
      const previewLines = lines.slice(0, 8);
      const formattedContent = previewLines
        .map(line => `<p>${line || '&nbsp;'}</p>`)
        .join('');
      
      contentEl.innerHTML = `
        <div class="letter-document stagger-children">${formattedContent}</div>
        <div class="letter-blur-overlay" id="letterBlurOverlay">
          <div class="blur-content">
            <div class="blur-icon">
              <i data-lucide="lock"></i>
            </div>
            <h4>Unlock This Letter</h4>
            <p>Get instant access to all 55+ dispute letters</p>
            <a href="register.html?plan=bundles" class="btn btn-primary">
              Get All Letters Free
            </a>
            <p class="blur-note">One-time payment • Lifetime access</p>
          </div>
        </div>
      `;
    }
    
    // Store current letter for reference
    window.currentLetter = template;
    
    if (window.lucide) lucide.createIcons();
  }, 400);
};

window.copyLetter = function() {
  if (!window.currentLetter) return;
  
  const btn = event.target.closest('button');
  if (btn) btn.classList.add('loading');
  
  navigator.clipboard.writeText(window.currentLetter.content).then(() => {
    if (btn) btn.classList.remove('loading');
    if (window.Toast) {
      Toast.success('Letter copied to clipboard!');
    } else {
      showToast('Letter copied to clipboard!', 'success');
    }
  }).catch(() => {
    if (btn) btn.classList.remove('loading');
    if (window.Toast) {
      Toast.error('Failed to copy');
    } else {
      showToast('Failed to copy', 'error');
    }
  });
};

window.downloadLetter = function() {
  if (!window.currentLetter) return;
  
  const btn = event.target.closest('button');
  if (btn) btn.classList.add('loading');
  
  // Brief delay for visual feedback
  setTimeout(() => {
    const blob = new Blob([window.currentLetter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${window.currentLetter.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (btn) btn.classList.remove('loading');
    
    if (window.Toast) {
      Toast.success('Letter downloaded!');
    } else {
      showToast('Letter downloaded!', 'success');
    }
  }, 300);
};

/* ============================================
   TOAST NOTIFICATION
   ============================================ */
function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 0.875rem 1.25rem;
    background: ${type === 'success' ? 'var(--accent-600)' : type === 'error' ? 'var(--rose-600)' : 'var(--dark-800)'};
    color: white;
    border-radius: 10px;
    font-size: 0.875rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);

console.log('CreditHopper Bundles JS initialized');
