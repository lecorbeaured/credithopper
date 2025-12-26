/* ============================================
   CREDIT REPAIR ENGINE V2 - JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initProgressSteps();
  initUploadZone();
  initStepNavigation();
  initItemSelection();
  initStrategySelection();
  initPersonalization();
  initLetterGeneration();
  lucide.createIcons();
});

/* ============================================
   STATE MANAGEMENT
   ============================================ */
const engineState = {
  currentStep: 1,
  totalSteps: 5,
  uploadedReports: [],
  identifiedItems: [],
  selectedItems: [],
  strategy: 'dual',
  personalization: {
    reasons: [],
    collectionStance: 'dont_recognize',
    chaseStance: 'not_late',
    chaseAccount: 'open',
    context: ''
  },
  generatedLetters: []
};

/* ============================================
   PROGRESS STEPS
   ============================================ */
function initProgressSteps() {
  updateProgressUI();
}

function updateProgressUI() {
  const steps = document.querySelectorAll('.progress-step');
  const lines = document.querySelectorAll('.progress-line');
  
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');
    
    if (stepNum < engineState.currentStep) {
      step.classList.add('completed');
    } else if (stepNum === engineState.currentStep) {
      step.classList.add('active');
    }
  });
  
  lines.forEach((line, index) => {
    if (index < engineState.currentStep - 1) {
      line.style.background = 'var(--accent-500)';
    } else {
      line.style.background = 'var(--dark-700)';
    }
  });
}

function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.engine-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show target step
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
    engineState.currentStep = stepNumber;
    updateProgressUI();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ============================================
   UPLOAD ZONE
   ============================================ */
function initUploadZone() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  
  if (!uploadZone || !fileInput) return;
  
  // Click to upload
  uploadZone.addEventListener('click', () => {
    fileInput.click();
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
      handleFileUpload(files[0]);
    }
  });
  
  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });
  
  // Cancel upload
  const cancelBtn = document.getElementById('cancelUpload');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }
}

function handleFileUpload(file) {
  const uploadZone = document.getElementById('uploadZone');
  const uploadProgress = document.getElementById('uploadProgress');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  // Validate file type
  if (!file.type.includes('pdf') && !file.type.includes('image')) {
    showToast('Please upload a PDF file', 'error');
    return;
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    showToast('File size must be less than 10MB', 'error');
    return;
  }
  
  // Show progress
  uploadZone.querySelector('.upload-zone-inner').classList.add('hidden');
  uploadProgress.classList.remove('hidden');
  
  // Set file info
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  
  // Simulate upload progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // Upload complete
      setTimeout(() => {
        uploadComplete(file);
      }, 300);
    }
    
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
  }, 200);
}

function uploadComplete(file) {
  const uploadZone = document.getElementById('uploadZone');
  const uploadProgress = document.getElementById('uploadProgress');
  
  // Reset upload zone
  uploadZone.querySelector('.upload-zone-inner').classList.remove('hidden');
  uploadProgress.classList.add('hidden');
  
  // Add to uploaded reports (mock - would determine bureau from file)
  const bureau = detectBureau(file.name);
  
  // Update reports list UI
  updateReportsList(bureau);
  
  showToast(`${bureau} report uploaded successfully!`, 'success');
}

function detectBureau(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes('equifax') || name.includes('eqfx')) return 'equifax';
  if (name.includes('experian') || name.includes('exp')) return 'experian';
  if (name.includes('transunion') || name.includes('tu')) return 'transunion';
  
  // Default to first not uploaded
  const reports = document.querySelectorAll('.report-item.pending');
  if (reports.length > 0) {
    return reports[0].dataset.bureau;
  }
  return 'equifax';
}

function updateReportsList(bureau) {
  const reportItem = document.querySelector(`.report-item[data-bureau="${bureau}"]`);
  if (!reportItem) return;
  
  reportItem.classList.remove('pending');
  reportItem.classList.add('uploaded');
  
  // Update icon
  const statusIcon = reportItem.querySelector('.report-status i');
  statusIcon.setAttribute('data-lucide', 'check-circle');
  
  // Update date
  const dateSpan = reportItem.querySelector('.report-date');
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  dateSpan.textContent = `Uploaded ${today}`;
  
  // Update actions
  const actions = reportItem.querySelector('.report-actions');
  actions.innerHTML = `
    <button class="btn-text">View</button>
    <button class="btn-text danger">Remove</button>
  `;
  
  // Reinitialize icons
  lucide.createIcons();
  
  // Track uploaded
  if (!engineState.uploadedReports.includes(bureau)) {
    engineState.uploadedReports.push(bureau);
  }
}

function resetUpload() {
  const uploadZone = document.getElementById('uploadZone');
  const uploadProgress = document.getElementById('uploadProgress');
  const fileInput = document.getElementById('fileInput');
  
  uploadZone.querySelector('.upload-zone-inner').classList.remove('hidden');
  uploadProgress.classList.add('hidden');
  fileInput.value = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ============================================
   STEP NAVIGATION
   ============================================ */
function initStepNavigation() {
  // Step 1 -> Step 2
  const continueToAnalysis = document.getElementById('continueToAnalysis');
  if (continueToAnalysis) {
    continueToAnalysis.addEventListener('click', () => {
      if (engineState.uploadedReports.length === 0) {
        showToast('Please upload at least one credit report', 'error');
        return;
      }
      
      showProcessingModal();
    });
  }
  
  // Step 2 -> Step 3
  const continueToStrategy = document.getElementById('continueToStrategy');
  if (continueToStrategy) {
    continueToStrategy.addEventListener('click', () => {
      const selectedCount = countSelectedItems();
      if (selectedCount === 0) {
        showToast('Please select at least one item to dispute', 'error');
        return;
      }
      goToStep(3);
    });
  }
  
  // Step 3 -> Step 2 (back)
  const backToItems = document.getElementById('backToItems');
  if (backToItems) {
    backToItems.addEventListener('click', () => goToStep(2));
  }
  
  // Step 3 -> Step 4
  const continueToPersonalize = document.getElementById('continueToPersonalize');
  if (continueToPersonalize) {
    continueToPersonalize.addEventListener('click', () => goToStep(4));
  }
  
  // Step 4 -> Step 3 (back)
  const backToStrategy = document.getElementById('backToStrategy');
  if (backToStrategy) {
    backToStrategy.addEventListener('click', () => goToStep(3));
  }
  
  // Step 4 -> Step 5
  const generateLetters = document.getElementById('generateLetters');
  if (generateLetters) {
    generateLetters.addEventListener('click', () => {
      showGeneratingModal();
    });
  }
  
  // Track disputes button
  const trackDisputes = document.getElementById('trackDisputes');
  if (trackDisputes) {
    trackDisputes.addEventListener('click', () => {
      // In real app, would save disputes to database
      window.location.href = 'dashboard.html';
    });
  }
}

/* ============================================
   PROCESSING MODAL
   ============================================ */
function showProcessingModal() {
  const modal = document.getElementById('processingModal');
  modal.classList.add('active');
  
  // Simulate processing steps
  const steps = modal.querySelectorAll('.processing-step');
  let currentStep = 0;
  
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      // Complete current step
      if (currentStep > 0) {
        steps[currentStep - 1].classList.remove('active');
        steps[currentStep - 1].classList.add('completed');
        const icon = steps[currentStep - 1].querySelector('i, .step-spinner');
        if (icon.classList.contains('step-spinner')) {
          const newIcon = document.createElement('i');
          newIcon.setAttribute('data-lucide', 'check-circle');
          icon.replaceWith(newIcon);
        }
      }
      
      // Activate next step
      if (currentStep < steps.length) {
        steps[currentStep].classList.add('active');
        const icon = steps[currentStep].querySelector('i');
        if (icon) {
          const spinner = document.createElement('div');
          spinner.className = 'step-spinner';
          icon.replaceWith(spinner);
        }
      }
      
      currentStep++;
      lucide.createIcons();
    } else {
      clearInterval(interval);
      
      // Complete last step
      steps[steps.length - 1].classList.remove('active');
      steps[steps.length - 1].classList.add('completed');
      
      setTimeout(() => {
        modal.classList.remove('active');
        goToStep(2);
        showToast('Analysis complete! Found 8 disputable items.', 'success');
      }, 500);
    }
  }, 800);
}

/* ============================================
   GENERATING MODAL
   ============================================ */
function showGeneratingModal() {
  const modal = document.getElementById('generatingModal');
  const progressFill = document.getElementById('genProgressFill');
  const progressText = document.getElementById('genProgressText');
  const currentText = document.getElementById('generatingCurrent');
  
  modal.classList.add('active');
  
  const letters = [
    'Equifax dispute letter',
    'Experian dispute letter',
    'TransUnion dispute letter',
    'Portfolio Recovery debt validation',
    'IC System debt validation',
    'Aura Financial debt validation',
    'Chase goodwill request'
  ];
  
  let current = 0;
  
  const interval = setInterval(() => {
    current++;
    
    if (current <= letters.length) {
      progressFill.style.width = `${(current / letters.length) * 100}%`;
      progressText.textContent = `${current} of ${letters.length} letters`;
      
      if (current < letters.length) {
        currentText.querySelector('span').textContent = `Creating ${letters[current]}...`;
      }
    } else {
      clearInterval(interval);
      
      setTimeout(() => {
        modal.classList.remove('active');
        goToStep(5);
        showToast('All letters generated successfully!', 'success');
      }, 500);
    }
  }, 600);
}

/* ============================================
   ITEM SELECTION
   ============================================ */
function initItemSelection() {
  // Handle choice options (radio buttons for wait/dispute)
  document.querySelectorAll('.choice-option').forEach(option => {
    option.addEventListener('click', () => {
      const parent = option.closest('.choice-options');
      parent.querySelectorAll('.choice-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    });
  });
  
  // Handle checkboxes
  document.querySelectorAll('.choice-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      if (checkbox.classList.contains('auto-selected')) return;
      
      const input = checkbox.querySelector('input');
      input.checked = !input.checked;
      updateSelectionSummary();
    });
  });
  
  // Handle dispute type options
  document.querySelectorAll('.dispute-type-option').forEach(option => {
    option.addEventListener('click', () => {
      const parent = option.closest('.dispute-type-options');
      parent.querySelectorAll('.dispute-type-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    });
  });
  
  // Handle question options
  document.querySelectorAll('.question-option').forEach(option => {
    option.addEventListener('click', () => {
      const parent = option.closest('.question-options');
      parent.querySelectorAll('.question-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    });
  });
  
  // Initialize summary
  updateSelectionSummary();
}

function countSelectedItems() {
  let count = 0;
  
  // Count items where user chose to dispute (not wait)
  document.querySelectorAll('.item-card').forEach(card => {
    // Check if it's a wait/dispute choice
    const waitChoice = card.querySelector('input[name^="choice_"][value="wait"]');
    if (waitChoice) {
      if (!waitChoice.checked) {
        count++;
      }
    } else {
      // It's a checkbox selection
      const checkbox = card.querySelector('.choice-checkbox input');
      if (checkbox && checkbox.checked) {
        count++;
      }
    }
  });
  
  return count;
}

function updateSelectionSummary() {
  const count = countSelectedItems();
  const countSpan = document.querySelector('.selected-count strong');
  const debtSpan = document.querySelector('.selected-debt');
  const button = document.getElementById('continueToStrategy');
  
  if (countSpan) countSpan.textContent = count;
  if (button) {
    button.innerHTML = `Continue with ${count} selected items <i data-lucide="arrow-right"></i>`;
    lucide.createIcons();
  }
  
  // Calculate debt (mock values)
  const debts = [2341, 892, 412]; // Mock debt values for items 2, 3, 5
  let totalDebt = 0;
  
  // Item 2 (Portfolio Recovery)
  const item2Checkbox = document.querySelector('input[name="select_2"]');
  if (item2Checkbox && item2Checkbox.checked) totalDebt += 2341;
  
  // Item 3 (Aura - auto selected)
  totalDebt += 892;
  
  // Item 4 (Chase late payment - no debt value)
  
  // Item 5 (IC System medical)
  const item5Checkbox = document.querySelector('input[name="select_5"]');
  if (item5Checkbox && item5Checkbox.checked) totalDebt += 412;
  
  if (debtSpan) debtSpan.textContent = `$${totalDebt.toLocaleString()} in disputable debt`;
}

/* ============================================
   STRATEGY SELECTION
   ============================================ */
function initStrategySelection() {
  document.querySelectorAll('.strategy-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.strategy-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
      
      engineState.strategy = option.querySelector('input').value;
    });
  });
}

/* ============================================
   PERSONALIZATION
   ============================================ */
function initPersonalization() {
  // Handle checkbox options
  document.querySelectorAll('.checkbox-option').forEach(option => {
    option.addEventListener('click', (e) => {
      if (e.target.classList.contains('other-input')) return;
      
      const input = option.querySelector('input[type="checkbox"]');
      input.checked = !input.checked;
      option.classList.toggle('selected', input.checked);
    });
  });
  
  // Handle radio options
  document.querySelectorAll('.radio-option').forEach(option => {
    option.addEventListener('click', () => {
      const parent = option.closest('.radio-group');
      parent.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    });
  });
}

/* ============================================
   LETTER GENERATION
   ============================================ */
function initLetterGeneration() {
  // Show more letters button
  const showMoreBtn = document.querySelector('.show-more-letters');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      showMoreBtn.textContent = 'Loading...';
      setTimeout(() => {
        showMoreBtn.style.display = 'none';
        // Would show more letters here
        showToast('All letters now visible', 'success');
      }, 500);
    });
  }
  
  // Expand preview buttons
  document.querySelectorAll('.expand-preview').forEach(btn => {
    btn.addEventListener('click', () => {
      const preview = btn.closest('.letter-preview');
      preview.classList.toggle('collapsed');
      
      if (preview.classList.contains('collapsed')) {
        btn.innerHTML = '<i data-lucide="chevron-down"></i><span>Show Preview</span>';
      } else {
        btn.innerHTML = '<i data-lucide="chevron-up"></i><span>Hide Preview</span>';
      }
      lucide.createIcons();
    });
  });
  
  // Download all button
  const downloadAll = document.getElementById('downloadAllLetters');
  if (downloadAll) {
    downloadAll.addEventListener('click', () => {
      showToast('Preparing download...', 'success');
      // Would generate and download ZIP
    });
  }
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${getToastIcon(type)}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return 'check-circle';
    case 'error': return 'alert-circle';
    case 'warning': return 'alert-triangle';
    default: return 'info';
  }
}

/* ============================================
   TOAST STYLES (injected)
   ============================================ */
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .toast-container {
    position: fixed;
    top: 5rem;
    right: 1rem;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--dark-800);
    border: 1px solid var(--dark-700);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transform: translateX(120%);
    transition: transform 0.3s ease;
    max-width: 350px;
  }
  
  .toast.show {
    transform: translateX(0);
  }
  
  .toast i {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  .toast span {
    font-size: 0.9375rem;
    color: var(--dark-200);
  }
  
  .toast-success i { color: var(--accent-400); }
  .toast-error i { color: #ef4444; }
  .toast-warning i { color: #fbbf24; }
  .toast-info i { color: #60a5fa; }
`;
document.head.appendChild(toastStyles);
