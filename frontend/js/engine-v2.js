/* ============================================
   CREDIT REPAIR ENGINE V2 - JAVASCRIPT
   With API Integration
   ============================================ */

const Engine = {
  // ===========================================
  // STATE
  // ===========================================
  state: {
    currentStep: 1,
    totalSteps: 5,
    reports: [],           // Uploaded reports from API
    items: [],             // Negative items from API
    selectedItems: [],     // Items selected for dispute
    selectedBureaus: {},   // { itemId: ['EQUIFAX', 'EXPERIAN'] }
    letterType: 'INITIAL_DISPUTE',
    generatedLetters: [],  // Generated letter content
    isLoading: false,
  },

  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  async init() {
    console.log('Engine V2 initializing...');
    
    // Check auth
    if (!API.auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=engine';
      return;
    }
    
    // Initialize components
    this.initProgressSteps();
    this.initUploadZone();
    this.initStepNavigation();
    this.initFilters();
    this.initLetterGeneration();
    
    // Load existing data
    await this.loadExistingData();
    
    // Initialize icons
    if (window.lucide) lucide.createIcons();
    
    console.log('Engine V2 initialized');
  },

  // ===========================================
  // LOAD EXISTING DATA
  // ===========================================
  
  async loadExistingData() {
    try {
      // Load existing reports
      const reportsRes = await API.reports.list();
      if (reportsRes.ok && reportsRes.data.data?.reports) {
        this.state.reports = reportsRes.data.data.reports;
        this.updateReportsListUI();
      }
      
      // Load existing items
      const itemsRes = await API.items.list({ limit: 100 });
      if (itemsRes.ok && itemsRes.data.data?.items) {
        this.state.items = itemsRes.data.data.items;
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  },

  // ===========================================
  // PROGRESS STEPS
  // ===========================================
  
  initProgressSteps() {
    this.updateProgressUI();
  },
  
  updateProgressUI() {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');
    
    steps.forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNum < this.state.currentStep) {
        step.classList.add('completed');
      } else if (stepNum === this.state.currentStep) {
        step.classList.add('active');
      }
    });
    
    lines.forEach((line, index) => {
      line.style.background = index < this.state.currentStep - 1 
        ? 'var(--accent-500)' 
        : 'var(--dark-700)';
    });
  },
  
  goToStep(stepNumber) {
    document.querySelectorAll('.engine-step').forEach(step => {
      step.classList.remove('active');
    });
    
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
      targetStep.classList.add('active');
      this.state.currentStep = stepNumber;
      this.updateProgressUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Refresh icons
      if (window.lucide) lucide.createIcons();
    }
  },

  // ===========================================
  // UPLOAD ZONE
  // ===========================================
  
  initUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadZone || !fileInput) return;
    
    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());
    
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
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
    
    // Cancel upload
    const cancelBtn = document.getElementById('cancelUpload');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetUpload();
      });
    }
  },
  
  async handleFileUpload(file) {
    const uploadZone = document.getElementById('uploadZone');
    const uploadProgress = document.getElementById('uploadProgress');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Validate file type
    if (!file.type.includes('pdf')) {
      this.showToast('Please upload a PDF file', 'error');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('File size must be less than 10MB', 'error');
      return;
    }
    
    // Show progress UI
    uploadZone.querySelector('.upload-zone-inner').classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    
    fileName.textContent = file.name;
    fileSize.textContent = this.formatFileSize(file.size);
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    
    // Animate progress while uploading
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 15, 90);
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
    
    try {
      // Upload to API
      const response = await API.reports.upload(file);
      
      clearInterval(progressInterval);
      progressFill.style.width = '100%';
      progressText.textContent = '100%';
      
      if (response.ok && response.data.data?.report) {
        const report = response.data.data.report;
        
        // Add to state
        this.state.reports.push(report);
        
        // Update UI
        setTimeout(() => {
          this.resetUpload();
          this.updateReportsListUI();
          this.showToast(`Report uploaded successfully!`, 'success');
          
          // Auto-parse if not already parsed
          if (report.parseStatus === 'PENDING') {
            this.parseReport(report.id);
          }
        }, 500);
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      this.resetUpload();
      this.showToast(error.message || 'Upload failed', 'error');
    }
  },
  
  async parseReport(reportId) {
    this.showToast('Analyzing report...', 'info');
    
    try {
      const response = await API.reports.parse(reportId);
      
      if (response.ok && response.data.data) {
        const { items, report } = response.data.data;
        
        // Update report in state
        const idx = this.state.reports.findIndex(r => r.id === reportId);
        if (idx !== -1) {
          this.state.reports[idx] = report;
        }
        
        // Add items to state (avoid duplicates)
        if (items && items.length > 0) {
          items.forEach(item => {
            if (!this.state.items.find(i => i.id === item.id)) {
              this.state.items.push(item);
            }
          });
          
          this.showToast(`Found ${items.length} negative items!`, 'success');
        } else {
          this.showToast('No negative items found in this report', 'info');
        }
        
        this.updateReportsListUI();
      }
    } catch (error) {
      console.error('Parse error:', error);
      this.showToast('Failed to analyze report', 'error');
    }
  },
  
  updateReportsListUI() {
    const reportsContainer = document.getElementById('reportsUploaded');
    if (!reportsContainer) return;
    
    const reportsList = reportsContainer.querySelector('.reports-list');
    if (!reportsList) return;
    
    // Group reports by bureau
    const bureauReports = {
      EQUIFAX: null,
      EXPERIAN: null,
      TRANSUNION: null,
    };
    
    this.state.reports.forEach(report => {
      if (report.bureau && bureauReports.hasOwnProperty(report.bureau)) {
        bureauReports[report.bureau] = report;
      }
    });
    
    // Render reports list
    reportsList.innerHTML = Object.entries(bureauReports).map(([bureau, report]) => {
      const bureauName = bureau.charAt(0) + bureau.slice(1).toLowerCase();
      
      if (report) {
        const date = new Date(report.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        const statusIcon = report.parseStatus === 'COMPLETED' ? 'check-circle' : 
                          report.parseStatus === 'PROCESSING' ? 'loader' : 'clock';
        const statusText = report.parseStatus === 'COMPLETED' ? `Uploaded ${date}` :
                          report.parseStatus === 'PROCESSING' ? 'Analyzing...' : 'Pending analysis';
        
        return `
          <div class="report-item uploaded" data-bureau="${bureau}" data-report-id="${report.id}">
            <div class="report-status">
              <i data-lucide="${statusIcon}"></i>
            </div>
            <div class="report-info">
              <span class="report-bureau">${bureauName}</span>
              <span class="report-date">${statusText}</span>
            </div>
            <div class="report-actions">
              <button class="btn-text" onclick="Engine.viewReport('${report.id}')">View</button>
              <button class="btn-text danger" onclick="Engine.removeReport('${report.id}')">Remove</button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="report-item pending" data-bureau="${bureau}">
            <div class="report-status">
              <i data-lucide="circle"></i>
            </div>
            <div class="report-info">
              <span class="report-bureau">${bureauName}</span>
              <span class="report-date">Not uploaded yet</span>
            </div>
            <div class="report-actions">
              <button class="btn-text primary" onclick="document.getElementById('fileInput').click()">Upload</button>
            </div>
          </div>
        `;
      }
    }).join('');
    
    // Refresh icons
    if (window.lucide) lucide.createIcons();
  },
  
  async removeReport(reportId) {
    if (!confirm('Remove this report? This will also remove any items found in it.')) {
      return;
    }
    
    try {
      const response = await API.reports.delete(reportId);
      if (response.ok) {
        // Remove from state
        this.state.reports = this.state.reports.filter(r => r.id !== reportId);
        
        // Refresh items
        const itemsRes = await API.items.list({ limit: 100 });
        if (itemsRes.ok) {
          this.state.items = itemsRes.data.data.items || [];
        }
        
        this.updateReportsListUI();
        this.showToast('Report removed', 'info');
      }
    } catch (error) {
      this.showToast('Failed to remove report', 'error');
    }
  },
  
  viewReport(reportId) {
    // Could open a modal or navigate to report details
    this.showToast('Report viewer coming soon', 'info');
  },
  
  resetUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const uploadProgress = document.getElementById('uploadProgress');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadZone) {
      uploadZone.querySelector('.upload-zone-inner').classList.remove('hidden');
    }
    if (uploadProgress) {
      uploadProgress.classList.add('hidden');
    }
    if (fileInput) {
      fileInput.value = '';
    }
  },

  // ===========================================
  // STEP NAVIGATION
  // ===========================================
  
  initStepNavigation() {
    // Step 1 -> Step 2 (Analysis)
    const continueToAnalysis = document.getElementById('continueToAnalysis');
    if (continueToAnalysis) {
      continueToAnalysis.addEventListener('click', () => this.proceedToAnalysis());
    }
    
    // Step 2 -> Step 3 (Strategy)
    const continueToStrategy = document.getElementById('continueToStrategy');
    if (continueToStrategy) {
      continueToStrategy.addEventListener('click', () => {
        if (this.state.selectedItems.length === 0) {
          this.showToast('Please select at least one item to dispute', 'error');
          return;
        }
        this.goToStep(3);
      });
    }
    
    // Back buttons
    document.querySelectorAll('[data-back-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.backStep);
        this.goToStep(step);
      });
    });
    
    // Step 3 -> Step 4
    const continueToPersonalize = document.getElementById('continueToPersonalize');
    if (continueToPersonalize) {
      continueToPersonalize.addEventListener('click', () => this.goToStep(4));
    }
    
    // Step 4 -> Step 5 (Generate Letters)
    const generateLettersBtn = document.getElementById('generateLettersBtn');
    if (generateLettersBtn) {
      generateLettersBtn.addEventListener('click', () => this.generateLetters());
    }
  },
  
  async proceedToAnalysis() {
    // Check if we have reports
    if (this.state.reports.length === 0) {
      this.showToast('Please upload at least one credit report', 'error');
      return;
    }
    
    // Check if reports are parsed
    const unparsed = this.state.reports.filter(r => r.parseStatus !== 'COMPLETED');
    if (unparsed.length > 0) {
      this.showToast('Please wait for reports to finish analyzing', 'error');
      return;
    }
    
    // If we don't have items, reload them
    if (this.state.items.length === 0) {
      const itemsRes = await API.items.list({ limit: 100 });
      if (itemsRes.ok && itemsRes.data.data?.items) {
        this.state.items = itemsRes.data.data.items;
      }
    }
    
    // Proceed to step 2
    this.renderItemsList();
    this.goToStep(2);
  },

  // ===========================================
  // ITEMS LIST (STEP 2)
  // ===========================================
  
  initFilters() {
    const filterType = document.getElementById('filterType');
    const filterBureau = document.getElementById('filterBureau');
    const filterSort = document.getElementById('filterSort');
    
    [filterType, filterBureau, filterSort].forEach(select => {
      if (select) {
        select.addEventListener('change', () => this.renderItemsList());
      }
    });
  },
  
  renderItemsList() {
    const container = document.getElementById('itemsList');
    if (!container) return;
    
    let items = [...this.state.items];
    
    // Apply filters
    const typeFilter = document.getElementById('filterType')?.value;
    const bureauFilter = document.getElementById('filterBureau')?.value;
    const sortBy = document.getElementById('filterSort')?.value;
    
    if (typeFilter && typeFilter !== 'all') {
      items = items.filter(item => item.accountType?.toLowerCase() === typeFilter);
    }
    
    if (bureauFilter && bureauFilter !== 'all') {
      items = items.filter(item => {
        if (bureauFilter === 'equifax') return item.onEquifax;
        if (bureauFilter === 'experian') return item.onExperian;
        if (bureauFilter === 'transunion') return item.onTransunion;
        return true;
      });
    }
    
    // Sort
    if (sortBy === 'balance') {
      items.sort((a, b) => (b.balance || 0) - (a.balance || 0));
    } else if (sortBy === 'date') {
      items.sort((a, b) => new Date(b.dateOpened || 0) - new Date(a.dateOpened || 0));
    }
    
    // Update summary
    this.updateItemsSummary(items);
    
    // Render items
    if (items.length === 0) {
      container.innerHTML = `
        <div class="items-empty" style="text-align: center; padding: 3rem;">
          <i data-lucide="search" style="width: 48px; height: 48px; color: var(--dark-500); margin-bottom: 1rem;"></i>
          <h3 style="color: #fff; margin-bottom: 0.5rem;">No Negative Items Found</h3>
          <p style="color: var(--dark-400);">Upload more credit reports or adjust your filters.</p>
        </div>
      `;
    } else {
      container.innerHTML = items.map(item => this.renderItemCard(item)).join('');
    }
    
    // Refresh icons
    if (window.lucide) lucide.createIcons();
    
    // Bind selection events
    this.bindItemSelectionEvents();
  },
  
  renderItemCard(item) {
    const isSelected = this.state.selectedItems.includes(item.id);
    const bureaus = [];
    if (item.onEquifax) bureaus.push('EQ');
    if (item.onExperian) bureaus.push('EX');
    if (item.onTransunion) bureaus.push('TU');
    
    // Calculate fall-off
    let fallOffInfo = '';
    if (item.monthsUntilFallsOff !== null && item.monthsUntilFallsOff !== undefined) {
      if (item.monthsUntilFallsOff <= 6) {
        fallOffInfo = `<div class="item-falloff">Falls off in ${item.monthsUntilFallsOff} months</div>`;
      }
    }
    
    return `
      <div class="item-card ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
        <div class="item-select">
          <input type="checkbox" id="item-${item.id}" ${isSelected ? 'checked' : ''}>
          <label for="item-${item.id}"></label>
        </div>
        
        <div class="item-header">
          <div class="item-type-wrap">
            <span class="item-type">${this.formatAccountType(item.accountType)}</span>
            <h3 class="item-creditor">${item.creditorName}</h3>
          </div>
          <div class="item-bureaus">
            ${bureaus.map(b => `<span class="bureau-tag ${b.toLowerCase()} active">${b}</span>`).join('')}
          </div>
        </div>
        
        <div class="item-details">
          <div class="detail-row">
            <span class="detail-label">Balance:</span>
            <span class="detail-value">${item.balance ? this.formatCurrency(item.balance) : 'N/A'}</span>
          </div>
          ${item.originalCreditor ? `
          <div class="detail-row">
            <span class="detail-label">Original Creditor:</span>
            <span class="detail-value">${item.originalCreditor}</span>
          </div>
          ` : ''}
          ${item.dateOpened ? `
          <div class="detail-row">
            <span class="detail-label">Date Opened:</span>
            <span class="detail-value">${this.formatDate(item.dateOpened)}</span>
          </div>
          ` : ''}
          ${item.accountStatus ? `
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${item.accountStatus}</span>
          </div>
          ` : ''}
        </div>
        
        ${fallOffInfo}
        
        <div class="item-actions">
          <button class="btn btn-sm btn-primary" onclick="Engine.selectItem('${item.id}')">
            ${isSelected ? 'Selected' : 'Select to Dispute'}
          </button>
        </div>
      </div>
    `;
  },
  
  updateItemsSummary(items) {
    const totalDebt = items.reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);
    const bureausAffected = new Set();
    items.forEach(item => {
      if (item.onEquifax) bureausAffected.add('EQUIFAX');
      if (item.onExperian) bureausAffected.add('EXPERIAN');
      if (item.onTransunion) bureausAffected.add('TRANSUNION');
    });
    
    // Update header
    const countEl = document.querySelector('.item-count');
    if (countEl) countEl.textContent = items.length;
    
    // Update summary stats
    const summaryStats = document.querySelectorAll('.summary-stat .stat-value');
    if (summaryStats.length >= 3) {
      summaryStats[0].textContent = this.formatCurrency(totalDebt);
      summaryStats[1].textContent = items.length;
      summaryStats[2].textContent = bureausAffected.size;
    }
  },
  
  bindItemSelectionEvents() {
    document.querySelectorAll('.item-card').forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const itemId = card.dataset.itemId;
          this.toggleItemSelection(itemId, e.target.checked);
        });
      }
    });
  },
  
  selectItem(itemId) {
    const isSelected = this.state.selectedItems.includes(itemId);
    this.toggleItemSelection(itemId, !isSelected);
    this.renderItemsList();
  },
  
  toggleItemSelection(itemId, selected) {
    if (selected) {
      if (!this.state.selectedItems.includes(itemId)) {
        this.state.selectedItems.push(itemId);
      }
    } else {
      this.state.selectedItems = this.state.selectedItems.filter(id => id !== itemId);
    }
    
    // Update selected count display
    const selectedCountEl = document.getElementById('selectedCount');
    if (selectedCountEl) {
      selectedCountEl.textContent = this.state.selectedItems.length;
    }
  },

  // ===========================================
  // LETTER GENERATION (STEP 5)
  // ===========================================
  
  initLetterGeneration() {
    // Letter type selection
    document.querySelectorAll('[data-letter-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.letterType = btn.dataset.letterType;
        document.querySelectorAll('[data-letter-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },
  
  async generateLetters() {
    if (this.state.selectedItems.length === 0) {
      this.showToast('Please select items to dispute', 'error');
      return;
    }
    
    this.showToast('Generating your letters...', 'info');
    this.state.isLoading = true;
    
    const generateBtn = document.getElementById('generateLettersBtn');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Generating...';
    }
    
    try {
      const letters = [];
      
      // Generate a letter for each selected item
      for (const itemId of this.state.selectedItems) {
        const item = this.state.items.find(i => i.id === itemId);
        if (!item) continue;
        
        // Determine which bureaus to send to
        const bureaus = [];
        if (item.onEquifax) bureaus.push('EQUIFAX');
        if (item.onExperian) bureaus.push('EXPERIAN');
        if (item.onTransunion) bureaus.push('TRANSUNION');
        
        // Generate letter for each bureau
        for (const bureau of bureaus) {
          const response = await API.letters.generate({
            negativeItemId: itemId,
            letterType: this.state.letterType,
            target: 'BUREAU',
            bureau: bureau,
          });
          
          if (response.ok && response.data.data) {
            letters.push({
              itemId,
              bureau,
              creditorName: item.creditorName,
              ...response.data.data,
            });
          }
        }
      }
      
      this.state.generatedLetters = letters;
      
      // Show letters
      this.renderGeneratedLetters();
      this.goToStep(5);
      
      this.showToast(`Generated ${letters.length} letters!`, 'success');
      
    } catch (error) {
      console.error('Letter generation error:', error);
      this.showToast('Failed to generate letters', 'error');
    } finally {
      this.state.isLoading = false;
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles"></i> Generate Letters';
        if (window.lucide) lucide.createIcons();
      }
    }
  },
  
  renderGeneratedLetters() {
    const container = document.getElementById('generatedLetters');
    if (!container) return;
    
    if (this.state.generatedLetters.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--dark-400);">No letters generated yet.</p>';
      return;
    }
    
    container.innerHTML = this.state.generatedLetters.map((letter, index) => `
      <div class="letter-card" data-letter-index="${index}">
        <div class="letter-header">
          <div class="letter-info">
            <h4>${letter.creditorName}</h4>
            <span class="letter-bureau">${letter.bureau}</span>
          </div>
          <div class="letter-actions">
            <button class="btn btn-sm btn-ghost" onclick="Engine.previewLetter(${index})">
              <i data-lucide="eye"></i> Preview
            </button>
            <button class="btn btn-sm btn-ghost" onclick="Engine.copyLetter(${index})">
              <i data-lucide="copy"></i> Copy
            </button>
            <button class="btn btn-sm btn-primary" onclick="Engine.downloadLetter(${index})">
              <i data-lucide="download"></i> Download
            </button>
          </div>
        </div>
        <div class="letter-preview">
          <pre>${letter.letter?.substring(0, 200)}...</pre>
        </div>
      </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
  },
  
  previewLetter(index) {
    const letter = this.state.generatedLetters[index];
    if (!letter) return;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'letter-modal';
    modal.innerHTML = `
      <div class="letter-modal-content">
        <div class="letter-modal-header">
          <h3>${letter.creditorName} - ${letter.bureau}</h3>
          <button class="btn-icon" onclick="this.closest('.letter-modal').remove()">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="letter-modal-body">
          <pre>${letter.completeLetter || letter.letter}</pre>
        </div>
        <div class="letter-modal-footer">
          <button class="btn btn-ghost" onclick="this.closest('.letter-modal').remove()">Close</button>
          <button class="btn btn-primary" onclick="Engine.copyLetter(${index}); this.closest('.letter-modal').remove();">
            <i data-lucide="copy"></i> Copy to Clipboard
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },
  
  copyLetter(index) {
    const letter = this.state.generatedLetters[index];
    if (!letter) return;
    
    const text = letter.completeLetter || letter.letter;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Letter copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy', 'error');
    });
  },
  
  downloadLetter(index) {
    const letter = this.state.generatedLetters[index];
    if (!letter) return;
    
    const text = letter.completeLetter || letter.letter;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute_${letter.creditorName.replace(/\s+/g, '_')}_${letter.bureau}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Letter downloaded!', 'success');
  },

  // ===========================================
  // UTILITIES
  // ===========================================
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  },
  
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  },
  
  formatAccountType(type) {
    const types = {
      COLLECTION: 'Collection',
      CHARGE_OFF: 'Charge-Off',
      LATE_PAYMENT: 'Late Payment',
      MEDICAL: 'Medical',
      CREDIT_CARD: 'Credit Card',
      AUTO_LOAN: 'Auto Loan',
      REPOSSESSION: 'Repossession',
      FORECLOSURE: 'Foreclosure',
      BANKRUPTCY: 'Bankruptcy',
      JUDGMENT: 'Judgment',
      INQUIRY: 'Inquiry',
    };
    return types[type] || type || 'Unknown';
  },
  
  showToast(message, type = 'default') {
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
    
    const colors = {
      success: '#059669',
      error: '#dc2626',
      warning: '#f59e0b',
      info: '#6366f1',
      default: '#374151'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 0.875rem 1.25rem;
      background: ${colors[type] || colors.default};
      color: white;
      border-radius: 10px;
      font-size: 0.875rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

// Make Engine globally available
window.Engine = Engine;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Engine.init());

// Add styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .item-card {
    transition: all 0.2s;
    border: 2px solid transparent;
  }
  
  .item-card.selected {
    border-color: var(--accent-500);
    background: rgba(52, 211, 153, 0.1);
  }
  
  .item-card .item-select {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
  
  .item-falloff {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-top: 1rem;
  }
  
  .letter-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }
  
  .letter-modal-content {
    background: var(--dark-900);
    border-radius: 16px;
    max-width: 700px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }
  
  .letter-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--dark-700);
  }
  
  .letter-modal-header h3 {
    margin: 0;
    color: #fff;
  }
  
  .letter-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .letter-modal-body pre {
    white-space: pre-wrap;
    font-family: inherit;
    color: var(--dark-300);
    line-height: 1.6;
  }
  
  .letter-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid var(--dark-700);
  }
  
  .letter-card {
    background: var(--dark-800);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .letter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .letter-info h4 {
    margin: 0;
    color: #fff;
  }
  
  .letter-bureau {
    font-size: 0.75rem;
    color: var(--accent-400);
    text-transform: uppercase;
  }
  
  .letter-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .letter-preview {
    background: var(--dark-900);
    border-radius: 8px;
    padding: 1rem;
  }
  
  .letter-preview pre {
    margin: 0;
    font-family: inherit;
    color: var(--dark-400);
    font-size: 0.875rem;
    white-space: pre-wrap;
  }
`;
document.head.appendChild(style);

console.log('CreditHopper Engine V2 loaded');
