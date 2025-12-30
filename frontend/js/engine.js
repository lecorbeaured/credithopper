/* ============================================
   CREDITHOPPER - ENGINE PAGE JS
   Section 4: Credit Repair Engine functionality
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initUploadZone();
  initGoogleDriveImport();
  initBureauSelection();
  initIssueSelection();
  initMobileMenu();
  checkTrialStatus();
});

/* ============================================
   STATE MANAGEMENT
   ============================================ */
const engineState = {
  file: null,
  bureau: null,
  issues: [],
  selectedIssues: [],
  generatedLetters: [],
  isTrialUser: true // Default to trial, would be set by auth system
};

/*
 * ============================================
 * BACKEND TODO: NAME VERIFICATION SYSTEM
 * ============================================
 * 
 * When implementing the backend, add name verification to prevent
 * users from repairing credit for others:
 * 
 * 1. REGISTRATION: Store user's full name in database
 * 
 * 2. FIRST CREDIT REPORT UPLOAD:
 *    - Use OCR/AI to extract name from credit report header
 *    - Compare extracted name with account holder name
 *    - If match: Lock this name to account (verified_credit_name)
 *    - If mismatch: Reject upload with error
 * 
 * 3. SUBSEQUENT UPLOADS:
 *    - Extract name from new report
 *    - Compare against locked verified_credit_name
 *    - Only allow if names match
 * 
 * Database fields needed:
 *    - users.full_name (from registration)
 *    - users.verified_credit_name (locked after first valid upload)
 *    - users.name_verified_at (timestamp)
 * 
 * This ensures one account = one person's credit repair only.
 * ============================================
 */

/* ============================================
   TRIAL STATUS CHECK
   ============================================ */
function checkTrialStatus() {
  // In production, this would check actual subscription status from API/auth
  // For demo, check URL parameter or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const isPaid = urlParams.get('plan') === 'pro' || urlParams.get('plan') === 'premium';
  const hasSubscription = localStorage.getItem('credithopper_subscription');
  
  engineState.isTrialUser = !isPaid && !hasSubscription;
  
  // Update UI based on trial status
  updateTrialUI();
}

function updateTrialUI() {
  const trialPrompt = document.getElementById('trialUpgradePrompt');
  const paidActions = document.getElementById('paidUserActions');
  const generateBtn = document.getElementById('generateBtn');
  
  if (engineState.isTrialUser) {
    // Show trial upgrade prompt, hide generate button
    if (trialPrompt) trialPrompt.style.display = 'block';
    if (paidActions) paidActions.style.display = 'none';
  } else {
    // Hide trial prompt, show generate button
    if (trialPrompt) trialPrompt.style.display = 'none';
    if (paidActions) paidActions.style.display = 'flex';
  }
}

/* ============================================
   UPLOAD FUNCTIONALITY
   ============================================ */
function initUploadZone() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const uploadZoneInner = document.querySelector('.upload-zone-inner');
  const cancelBtn = document.getElementById('cancelUpload');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  if (!uploadZone || !fileInput) return;
  
  // Click to upload
  uploadZone.addEventListener('click', (e) => {
    if (!uploadZone.classList.contains('has-file')) {
      fileInput.click();
    }
  });
  
  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });
  
  // Cancel upload
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }
  
  // Analyze button
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeReport);
  }
}

function handleFileSelect(file) {
  const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!validTypes.includes(file.type)) {
    showToast('Please upload a PDF, PNG, or JPG file', 'error');
    return;
  }
  
  if (file.size > maxSize) {
    showToast('File size must be under 10MB', 'error');
    return;
  }
  
  engineState.file = file;
  
  // Update UI
  const uploadZone = document.getElementById('uploadZone');
  const uploadZoneInner = document.querySelector('.upload-zone-inner');
  const uploadProgress = document.getElementById('uploadProgress');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  
  uploadZone.classList.add('has-file');
  uploadZoneInner.classList.add('hidden');
  uploadProgress.classList.remove('hidden');
  
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  
  // Simulate upload progress
  simulateUpload();
}

function simulateUpload() {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  let progress = 0;
  
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      progressText.textContent = 'Upload complete!';
      progressFill.style.width = '100%';
      checkReadyToAnalyze();
    } else {
      progressText.textContent = `Uploading... ${Math.round(progress)}%`;
      progressFill.style.width = `${progress}%`;
    }
  }, 200);
}

function resetUpload() {
  engineState.file = null;
  
  const uploadZone = document.getElementById('uploadZone');
  const uploadZoneInner = document.querySelector('.upload-zone-inner');
  const uploadProgress = document.getElementById('uploadProgress');
  const fileInput = document.getElementById('fileInput');
  const progressFill = document.getElementById('progressFill');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  uploadZone.classList.remove('has-file');
  uploadZoneInner.classList.remove('hidden');
  uploadProgress.classList.add('hidden');
  fileInput.value = '';
  progressFill.style.width = '0%';
  analyzeBtn.disabled = true;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ============================================
   GOOGLE DRIVE IMPORT
   ============================================ */
function initGoogleDriveImport() {
  const googleDriveBtn = document.getElementById('googleDriveBtn');
  if (!googleDriveBtn) return;
  
  googleDriveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering upload zone click
    
    // Check if GooglePickerService is available
    if (typeof GooglePickerService === 'undefined') {
      showToast('Google Drive integration is not available. Please use file upload instead.', 'error');
      return;
    }
    
    // Check if properly configured
    if (GooglePickerService.CLIENT_ID.includes('YOUR_')) {
      showToast('Google Drive is not configured. Please contact support.', 'error');
      console.error('[Engine] Google Picker credentials not configured');
      return;
    }
    
    // Show loading state on button
    const originalContent = googleDriveBtn.innerHTML;
    googleDriveBtn.innerHTML = '<span class="btn-loading"></span> Connecting...';
    googleDriveBtn.disabled = true;
    
    try {
      // Initialize picker if not already done
      await GooglePickerService.init();
      
      // Open the picker
      GooglePickerService.open({
        viewMode: 'all', // Show PDFs and images
        multiSelect: false,
        
        onSelect: async (result) => {
          // Reset button
          googleDriveBtn.innerHTML = originalContent;
          googleDriveBtn.disabled = false;
          
          if (!result.success) {
            showToast(result.error || 'Failed to select file', 'error');
            return;
          }
          
          if (!result.files || result.files.length === 0) {
            showToast('No file selected', 'error');
            return;
          }
          
          const selectedFile = result.files[0];
          console.log('[Engine] File selected from Drive:', selectedFile.name);
          
          // Validate file type
          const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
          if (!validTypes.includes(selectedFile.mimeType)) {
            showToast('Please select a PDF or image file', 'error');
            return;
          }
          
          // Show downloading state
          showToast('Downloading file from Google Drive...', 'default');
          
          try {
            // Download the file from Google Drive
            const file = await GooglePickerService.downloadAsFile(selectedFile);
            
            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
              showToast('File size must be under 10MB', 'error');
              return;
            }
            
            // Process the file using existing handler
            handleFileSelect(file);
            showToast(`Imported "${selectedFile.name}" from Google Drive`, 'success');
            
          } catch (downloadError) {
            console.error('[Engine] Failed to download from Drive:', downloadError);
            showToast('Failed to download file from Google Drive. Please try again.', 'error');
          }
        },
        
        onCancel: () => {
          // Reset button
          googleDriveBtn.innerHTML = originalContent;
          googleDriveBtn.disabled = false;
          console.log('[Engine] Google Drive picker cancelled');
        }
      });
      
    } catch (error) {
      console.error('[Engine] Google Drive import error:', error);
      googleDriveBtn.innerHTML = originalContent;
      googleDriveBtn.disabled = false;
      showToast('Failed to open Google Drive. Please try again.', 'error');
    }
  });
}

/* ============================================
   BUREAU SELECTION
   ============================================ */
function initBureauSelection() {
  const bureauOptions = document.querySelectorAll('input[name="bureau"]');
  
  bureauOptions.forEach(option => {
    option.addEventListener('change', (e) => {
      engineState.bureau = e.target.value;
      checkReadyToAnalyze();
    });
  });
}

function checkReadyToAnalyze() {
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.disabled = !(engineState.file && engineState.bureau);
  }
}

/* ============================================
   ANALYSIS PROCESS
   ============================================ */
function analyzeReport() {
  const modal = document.getElementById('processingModal');
  const modalContent = modal.querySelector('.modal');
  
  // Update modal content for analysis
  const processingContent = modal.querySelector('.processing-content');
  if (processingContent) {
    processingContent.innerHTML = `
      <div class="generation-loader">
        <div class="generation-icon">
          <div class="generation-icon-inner">
            <i data-lucide="scan"></i>
          </div>
          <div class="generation-rings">
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
          </div>
        </div>
        
        <h3 class="generation-title">Analyzing Your Report</h3>
        <p class="generation-subtitle">Our AI is scanning for disputable items</p>
        
        <div class="generation-steps">
          <div class="generation-step active" id="procStep1">
            <div class="generation-step-icon">
              <i data-lucide="upload"></i>
            </div>
            <span class="generation-step-text">Extracting report data...</span>
          </div>
          <div class="generation-step" id="procStep2">
            <div class="generation-step-icon">
              <i data-lucide="search"></i>
            </div>
            <span class="generation-step-text">Scanning for negative items...</span>
          </div>
          <div class="generation-step" id="procStep3">
            <div class="generation-step-icon">
              <i data-lucide="shield-check"></i>
            </div>
            <span class="generation-step-text">Checking against dispute criteria...</span>
          </div>
          <div class="generation-step" id="procStep4">
            <div class="generation-step-icon">
              <i data-lucide="check-circle"></i>
            </div>
            <span class="generation-step-text">Preparing recommendations...</span>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }
  
  openModal(modal);
  
  // Animate through steps
  const steps = ['procStep1', 'procStep2', 'procStep3', 'procStep4'];
  let currentStep = 0;
  
  const stepInterval = setInterval(() => {
    if (currentStep > 0) {
      const prevStep = document.getElementById(steps[currentStep - 1]);
      if (prevStep) {
        prevStep.classList.remove('active');
        prevStep.classList.add('complete');
        const icon = prevStep.querySelector('.generation-step-icon i');
        if (icon) {
          icon.setAttribute('data-lucide', 'check');
          lucide.createIcons();
        }
      }
    }
    
    if (currentStep < steps.length) {
      const step = document.getElementById(steps[currentStep]);
      if (step) step.classList.add('active');
      currentStep++;
    } else {
      clearInterval(stepInterval);
      
      // Complete analysis
      // BACKEND TODO: Add name verification check here before proceeding
      // See NAME VERIFICATION SYSTEM comment at top of file
      setTimeout(() => {
        closeModal('processingModal');
        generateMockIssues();
        goToStep(2);
        
        // Show success toast
        if (window.Toast) {
          Toast.success('Analysis complete! Found disputable items.');
        }
      }, 500);
    }
  }, 900);
}

function resetProcessingSteps() {
  const steps = ['procStep1', 'procStep2', 'procStep3', 'procStep4'];
  steps.forEach((stepId, index) => {
    const step = document.getElementById(stepId);
    step.classList.remove('active', 'completed');
    if (index === 0) step.classList.add('active');
    step.querySelector('i').setAttribute('data-lucide', index === 0 ? 'check-circle' : 'circle');
  });
  lucide.createIcons();
}

/* ============================================
   MOCK DATA GENERATION
   ============================================ */
function generateMockIssues() {
  // Generate realistic mock issues
  engineState.issues = [
    {
      id: 1,
      type: 'collection',
      creditor: 'Midland Credit Management',
      amount: '$1,247.00',
      dateReported: 'Mar 2023',
      accountNumber: '****4521',
      reason: 'Medical bill from 2021'
    },
    {
      id: 2,
      type: 'collection',
      creditor: 'Portfolio Recovery Associates',
      amount: '$892.00',
      dateReported: 'Jul 2023',
      accountNumber: '****7832',
      reason: 'Old credit card debt'
    },
    {
      id: 3,
      type: 'collection',
      creditor: 'LVNV Funding LLC',
      amount: '$534.00',
      dateReported: 'Nov 2022',
      accountNumber: '****2109',
      reason: 'Unknown debt'
    },
    {
      id: 4,
      type: 'late-payment',
      creditor: 'Capital One',
      amount: 'N/A',
      dateReported: 'Aug 2023',
      accountNumber: '****8891',
      reason: '30 days late - Aug 2023'
    },
    {
      id: 5,
      type: 'late-payment',
      creditor: 'Chase Bank',
      amount: 'N/A',
      dateReported: 'Dec 2022',
      accountNumber: '****3344',
      reason: '60 days late - Dec 2022'
    },
    {
      id: 6,
      type: 'inquiry',
      creditor: 'Unknown Lender',
      amount: 'N/A',
      dateReported: 'Sep 2023',
      accountNumber: 'N/A',
      reason: 'Unauthorized hard inquiry'
    },
    {
      id: 7,
      type: 'inquiry',
      creditor: 'Auto Loan Services',
      amount: 'N/A',
      dateReported: 'Oct 2023',
      accountNumber: 'N/A',
      reason: 'Unauthorized hard inquiry'
    }
  ];
  
  renderIssues();
  updateSummaryCounts();
}

function renderIssues() {
  const container = document.getElementById('issuesList');
  if (!container) return;
  
  container.innerHTML = engineState.issues.map(issue => `
    <div class="issue-card" data-id="${issue.id}">
      <div class="issue-checkbox">
        <label class="checkbox-label">
          <input type="checkbox" class="issue-select" data-id="${issue.id}">
          <span class="checkbox-custom"></span>
        </label>
      </div>
      <div class="issue-content">
        <div class="issue-header">
          <span class="issue-title">${issue.creditor}</span>
          <span class="issue-type ${issue.type}">${formatIssueType(issue.type)}</span>
        </div>
        <div class="issue-details">
          ${issue.amount !== 'N/A' ? `
            <div class="issue-detail">
              <span>Amount</span>
              <strong>${issue.amount}</strong>
            </div>
          ` : ''}
          <div class="issue-detail">
            <span>Reported</span>
            <strong>${issue.dateReported}</strong>
          </div>
          ${issue.accountNumber !== 'N/A' ? `
            <div class="issue-detail">
              <span>Account</span>
              <strong>${issue.accountNumber}</strong>
            </div>
          ` : ''}
          <div class="issue-detail">
            <span>Issue</span>
            <strong>${issue.reason}</strong>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Reinitialize issue selection
  initIssueSelection();
}

function formatIssueType(type) {
  const types = {
    'collection': 'Collection',
    'late-payment': 'Late Payment',
    'inquiry': 'Hard Inquiry'
  };
  return types[type] || type;
}

function updateSummaryCounts() {
  const collections = engineState.issues.filter(i => i.type === 'collection').length;
  const latePayments = engineState.issues.filter(i => i.type === 'late-payment').length;
  const inquiries = engineState.issues.filter(i => i.type === 'inquiry').length;
  
  document.getElementById('issueCount').textContent = engineState.issues.length;
  document.getElementById('collectionsCount').textContent = collections;
  document.getElementById('latePaymentsCount').textContent = latePayments;
  document.getElementById('inquiriesCount').textContent = inquiries;
}

/* ============================================
   ISSUE SELECTION
   ============================================ */
function initIssueSelection() {
  const checkboxes = document.querySelectorAll('.issue-select');
  const selectAll = document.getElementById('selectAllIssues');
  const generateBtn = document.getElementById('generateBtn');
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      const card = e.target.closest('.issue-card');
      
      if (e.target.checked) {
        if (!engineState.selectedIssues.includes(id)) {
          engineState.selectedIssues.push(id);
        }
        card.classList.add('selected');
      } else {
        engineState.selectedIssues = engineState.selectedIssues.filter(i => i !== id);
        card.classList.remove('selected');
      }
      
      updateSelectedCount();
      updateSelectAll();
    });
  });
  
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      
      checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const card = checkbox.closest('.issue-card');
        const id = parseInt(checkbox.dataset.id);
        
        if (isChecked) {
          card.classList.add('selected');
          if (!engineState.selectedIssues.includes(id)) {
            engineState.selectedIssues.push(id);
          }
        } else {
          card.classList.remove('selected');
        }
      });
      
      if (!isChecked) {
        engineState.selectedIssues = [];
      }
      
      updateSelectedCount();
    });
  }
  
  if (generateBtn) {
    generateBtn.addEventListener('click', generateLetters);
  }
}

function updateSelectedCount() {
  const countEl = document.getElementById('selectedCount');
  const generateBtn = document.getElementById('generateBtn');
  
  if (countEl) {
    countEl.textContent = engineState.selectedIssues.length;
  }
  
  if (generateBtn) {
    generateBtn.disabled = engineState.selectedIssues.length === 0;
  }
}

function updateSelectAll() {
  const selectAll = document.getElementById('selectAllIssues');
  const checkboxes = document.querySelectorAll('.issue-select');
  
  if (selectAll) {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    selectAll.checked = allChecked;
    selectAll.indeterminate = someChecked && !allChecked;
  }
}

/* ============================================
   LETTER GENERATION
   ============================================ */
function generateLetters() {
  const modal = document.getElementById('processingModal');
  
  // Update modal content for letter generation
  const processingContent = modal.querySelector('.processing-content');
  if (processingContent) {
    processingContent.innerHTML = `
      <div class="generation-loader">
        <div class="generation-icon">
          <div class="generation-icon-inner">
            <i data-lucide="sparkles"></i>
          </div>
          <div class="generation-rings">
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
          </div>
        </div>
        
        <h3 class="generation-title">Generating Your Letters</h3>
        <p class="generation-subtitle">Creating ${engineState.selectedIssues.length} personalized dispute letter${engineState.selectedIssues.length > 1 ? 's' : ''}</p>
        
        <div class="generation-steps">
          <div class="generation-step active" id="genStep1">
            <div class="generation-step-icon">
              <i data-lucide="file-text"></i>
            </div>
            <span class="generation-step-text">Selecting optimal templates...</span>
          </div>
          <div class="generation-step" id="genStep2">
            <div class="generation-step-icon">
              <i data-lucide="edit-3"></i>
            </div>
            <span class="generation-step-text">Personalizing content...</span>
          </div>
          <div class="generation-step" id="genStep3">
            <div class="generation-step-icon">
              <i data-lucide="scale"></i>
            </div>
            <span class="generation-step-text">Adding legal citations...</span>
          </div>
          <div class="generation-step" id="genStep4">
            <div class="generation-step-icon">
              <i data-lucide="check-circle"></i>
            </div>
            <span class="generation-step-text">Finalizing documents...</span>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }
  
  openModal(modal);
  
  // Animate through generation steps
  const steps = ['genStep1', 'genStep2', 'genStep3', 'genStep4'];
  let currentStep = 0;
  
  const stepInterval = setInterval(() => {
    if (currentStep > 0) {
      const prevStep = document.getElementById(steps[currentStep - 1]);
      if (prevStep) {
        prevStep.classList.remove('active');
        prevStep.classList.add('complete');
        const icon = prevStep.querySelector('.generation-step-icon i');
        if (icon) {
          icon.setAttribute('data-lucide', 'check');
          lucide.createIcons();
        }
      }
    }
    
    if (currentStep < steps.length) {
      const step = document.getElementById(steps[currentStep]);
      if (step) step.classList.add('active');
      currentStep++;
    } else {
      clearInterval(stepInterval);
      
      setTimeout(() => {
        closeModal('processingModal');
        
        // Generate letters for selected issues
        engineState.generatedLetters = engineState.selectedIssues.map(id => {
          const issue = engineState.issues.find(i => i.id === id);
          return {
            id,
            name: `${formatIssueType(issue.type)} Dispute - ${issue.creditor}`,
            target: `To: ${getBureauName()} regarding ${issue.creditor}`,
            issue
          };
        });
        
        renderLetters();
        goToStep(3);
        
        // Show success with confetti!
        if (window.Toast) {
          Toast.success(`${engineState.generatedLetters.length} letter${engineState.generatedLetters.length > 1 ? 's' : ''} generated successfully!`);
        }
        if (window.Confetti) {
          Confetti.launch(30);
        }
      }, 500);
    }
  }, 700);
}

function getBureauName() {
  const names = {
    'equifax': 'Equifax',
    'experian': 'Experian',
    'transunion': 'TransUnion'
  };
  return names[engineState.bureau] || 'Credit Bureau';
}

function renderLetters() {
  const container = document.getElementById('lettersList');
  if (!container) return;
  
  container.innerHTML = engineState.generatedLetters.map(letter => `
    <div class="letter-item">
      <div class="letter-icon">
        <i data-lucide="file-text"></i>
      </div>
      <div class="letter-info">
        <div class="letter-name">${letter.name}</div>
        <div class="letter-target">${letter.target}</div>
      </div>
      <div class="letter-actions">
        <button class="btn btn-outline btn-sm" onclick="previewLetter(${letter.id})">
          <i data-lucide="eye"></i>
          Preview
        </button>
        <button class="btn btn-primary btn-sm" onclick="downloadSingleLetter(${letter.id})">
          <i data-lucide="download"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  lucide.createIcons();
  
  // Setup download buttons
  document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAllLetters);
  document.getElementById('emailLettersBtn')?.addEventListener('click', () => openModal(document.getElementById('emailModal')));
}

/* ============================================
   DOWNLOAD & EMAIL
   ============================================ */
window.previewLetter = function(id) {
  const letter = engineState.generatedLetters.find(l => l.id === id);
  if (!letter) return;
  
  const content = generateLetterContent(letter);
  
  // Open in new window for preview
  const previewWindow = window.open('', '_blank', 'width=800,height=600');
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${letter.name}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { font-size: 14px; margin-bottom: 2rem; }
        p { margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${content}</pre>
    </body>
    </html>
  `);
};

window.downloadSingleLetter = function(id) {
  const letter = engineState.generatedLetters.find(l => l.id === id);
  if (!letter) return;
  
  const content = generateLetterContent(letter);
  downloadTextFile(content, `${letter.name.replace(/\s+/g, '_')}.txt`);
  showToast('Letter downloaded!', 'success');
};

function downloadAllLetters() {
  // In a real app, this would generate a ZIP file
  // For demo, download each letter
  engineState.generatedLetters.forEach(letter => {
    const content = generateLetterContent(letter);
    downloadTextFile(content, `${letter.name.replace(/\s+/g, '_')}.txt`);
  });
  
  showToast(`${engineState.generatedLetters.length} letters downloaded!`, 'success');
}

function generateLetterContent(letter) {
  const issue = letter.issue;
  const bureau = getBureauName();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `[Your Full Name]
[Your Address]
[City, State ZIP]

${today}

${bureau}
${getBureauAddress(engineState.bureau)}

Re: Dispute - Verify or Remove
    Account: ${issue.accountNumber || 'N/A'}
    Creditor: ${issue.creditor}

To Whom It May Concern,

I am disputing the following item on my credit report. I am requesting that you verify this information is 100% accurate and complete - not just check a box, but actually investigate.

DISPUTED ITEM:
Creditor/Company: ${issue.creditor}
Account Number: ${issue.accountNumber || 'N/A'}
Type: ${formatIssueType(issue.type)}
${issue.amount !== 'N/A' ? `Amount Claimed: ${issue.amount}` : ''}
Date Reported: ${issue.dateReported}

MY DISPUTE:
${getDisputeReason(issue)}

WHAT I REQUIRE FROM YOU:

1. The specific method of verification you used (not just "verified by creditor")
2. The name, address, and phone number of the person you spoke with
3. Copies of any documents they provided proving this information is accurate
4. Proof that this item meets all legal requirements for reporting

If you cannot provide documented verification of EVERY detail, you must remove this item. Do not simply parrot back what the furnisher tells you - that's not a reasonable investigation.

I expect a response within 30 days with either:
A) Full documentation proving accuracy, or
B) Confirmation this item has been removed

Send me an updated credit report showing the results.

[Your Name]`;
}

function getBureauAddress(bureau) {
  const addresses = {
    'equifax': 'P.O. Box 740256\nAtlanta, GA 30348',
    'experian': 'P.O. Box 4500\nAllen, TX 75013',
    'transunion': 'P.O. Box 2000\nChester, PA 19016'
  };
  return addresses[bureau] || '[Bureau Address]';
}

function getDisputeReason(issue) {
  if (issue.type === 'collection') {
    return `I dispute this collection account. The burden is on you and the collector to prove:

- This debt is actually mine
- The amount is accurate
- The collector has legal authority to collect
- The original creditor properly assigned this debt
- The dates being reported are correct

Don't just ask the collector "is this right?" and accept their word. Make them prove it with documentation. If they can't produce the original signed agreement with my signature and a complete payment history from the original creditor, this doesn't belong on my report.`;
  }
  
  if (issue.type === 'late-payment') {
    return `I dispute this late payment. I want you to verify:

- The exact date the payment was received
- The exact date it was due
- Documentation proving it was actually late
- That the creditor reported it within proper timeframes

Don't just accept the creditor's word - make them show proof. If they can't document exactly when my payment was received and that it was actually past the allowed timeframe, remove this late payment notation.`;
  }
  
  if (issue.type === 'inquiry') {
    return `I did not authorize this inquiry. Make them prove I did.

Contact the company and demand they produce my signed written authorization. A verbal "yes" on a phone call doesn't count. If they cannot provide documented proof that I authorized this credit pull, remove it immediately.

Unauthorized access to my credit report is not something I take lightly.`;
  }
  
  return `This information is inaccurate. I am demanding you verify every detail with documented proof - not just a quick call to the furnisher. If it cannot be fully verified, remove it.`;
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.sendEmail = function() {
  const email = document.getElementById('emailAddress').value;
  
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address', 'error');
    return;
  }
  
  // In a real app, this would send to a backend
  showToast(`Letters sent to ${email}!`, 'success');
  closeModal('emailModal');
};

/* ============================================
   STEP NAVIGATION
   ============================================ */
window.goToStep = function(stepNum) {
  // Hide all steps
  document.querySelectorAll('.engine-step').forEach(step => {
    step.classList.add('hidden');
  });
  
  // Show target step
  const targetStep = document.getElementById(`step${stepNum}`);
  if (targetStep) {
    targetStep.classList.remove('hidden');
  }
  
  // Update progress steps
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    const num = index + 1;
    step.classList.remove('active', 'completed');
    
    if (num < stepNum) {
      step.classList.add('completed');
    } else if (num === stepNum) {
      step.classList.add('active');
    }
  });
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
}

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
    background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#374151'};
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

console.log('CreditHopper Engine JS initialized');
