/* ============================================
   CREDITHOPPER - MY LETTERS JS
   Dispute Tracking & Management
   ============================================ */

const MyLetters = {
  // ===========================================
  // STATE
  // ===========================================
  state: {
    disputes: [],
    items: [],
    filter: 'all',       // all, drafts, mailed, responded, completed
    sortBy: 'recent',    // recent, creditor, status
    searchQuery: '',
    selectedDispute: null,
  },

  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  async init() {
    console.log('My Letters initializing...');
    
    // Check auth
    if (!API.auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    
    // Initialize UI
    this.initSidebar();
    this.initFilters();
    this.initSearch();
    this.initModals();
    
    // Load data
    await this.loadData();
    
    // Initialize icons
    if (window.lucide) lucide.createIcons();
    
    console.log('My Letters initialized');
  },

  // ===========================================
  // DATA LOADING
  // ===========================================
  
  async loadData() {
    this.showLoading();
    
    try {
      // Load disputes
      const disputesRes = await API.disputes.list({ limit: 100 });
      if (disputesRes.ok && disputesRes.data.data?.disputes) {
        this.state.disputes = disputesRes.data.data.disputes;
      }
      
      // Load items for reference
      const itemsRes = await API.items.list({ limit: 100 });
      if (itemsRes.ok && itemsRes.data.data?.items) {
        this.state.items = itemsRes.data.data.items;
      }
      
      // Render
      this.renderDisputes();
      this.updateStats();
      
    } catch (error) {
      console.error('Load error:', error);
      this.showToast('Failed to load disputes', 'error');
    } finally {
      this.hideLoading();
    }
  },

  // ===========================================
  // RENDERING
  // ===========================================
  
  renderDisputes() {
    const container = document.getElementById('disputesContainer');
    if (!container) return;
    
    let disputes = [...this.state.disputes];
    
    // Apply filter
    if (this.state.filter !== 'all') {
      disputes = disputes.filter(d => {
        if (this.state.filter === 'drafts') return d.status === 'DRAFT';
        if (this.state.filter === 'mailed') return d.status === 'MAILED' || d.status === 'AWAITING_RESPONSE';
        if (this.state.filter === 'responded') return d.status === 'RESPONSE_RECEIVED';
        if (this.state.filter === 'completed') return ['SUCCESSFUL', 'UNSUCCESSFUL', 'PARTIAL'].includes(d.status);
        return true;
      });
    }
    
    // Apply search
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      disputes = disputes.filter(d => 
        d.negativeItem?.creditorName?.toLowerCase().includes(query) ||
        d.bureau?.toLowerCase().includes(query) ||
        d.letterType?.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    if (this.state.sortBy === 'recent') {
      disputes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (this.state.sortBy === 'creditor') {
      disputes.sort((a, b) => (a.negativeItem?.creditorName || '').localeCompare(b.negativeItem?.creditorName || ''));
    } else if (this.state.sortBy === 'status') {
      const statusOrder = ['DRAFT', 'MAILED', 'AWAITING_RESPONSE', 'RESPONSE_RECEIVED', 'SUCCESSFUL', 'PARTIAL', 'UNSUCCESSFUL'];
      disputes.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
    }
    
    // Render
    if (disputes.length === 0) {
      container.innerHTML = this.renderEmptyState();
    } else {
      container.innerHTML = disputes.map(d => this.renderDisputeCard(d)).join('');
    }
    
    // Refresh icons
    if (window.lucide) lucide.createIcons();
  },
  
  renderEmptyState() {
    if (this.state.disputes.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">
            <i data-lucide="file-text"></i>
          </div>
          <h3>No Disputes Yet</h3>
          <p>Upload a credit report and generate your first dispute letter to get started.</p>
          <a href="engine-v2.html" class="btn btn-primary">
            <i data-lucide="plus"></i>
            Start New Dispute
          </a>
        </div>
      `;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">
          <i data-lucide="search"></i>
        </div>
        <h3>No Matching Disputes</h3>
        <p>Try adjusting your filters or search query.</p>
        <button class="btn btn-outline" onclick="MyLetters.clearFilters()">Clear Filters</button>
      </div>
    `;
  },
  
  renderDisputeCard(dispute) {
    const item = dispute.negativeItem || {};
    const statusInfo = this.getStatusInfo(dispute.status);
    const daysInfo = this.getDaysInfo(dispute);
    
    return `
      <div class="dispute-card" data-dispute-id="${dispute.id}">
        <div class="dispute-card-header">
          <div class="dispute-status-badge ${statusInfo.class}">
            <i data-lucide="${statusInfo.icon}"></i>
            <span>${statusInfo.label}</span>
          </div>
          <div class="dispute-bureau">
            <span class="bureau-tag ${dispute.bureau?.toLowerCase()}">${dispute.bureau || 'N/A'}</span>
          </div>
        </div>
        
        <div class="dispute-card-body">
          <h3 class="dispute-creditor">${item.creditorName || 'Unknown Creditor'}</h3>
          <div class="dispute-details">
            <span class="dispute-type">${this.formatAccountType(item.accountType)}</span>
            <span class="dispute-amount">${item.balance ? this.formatCurrency(item.balance) : 'N/A'}</span>
          </div>
          <div class="dispute-letter-type">
            <i data-lucide="file-text"></i>
            <span>${this.formatLetterType(dispute.letterType)}</span>
          </div>
        </div>
        
        ${daysInfo ? `
        <div class="dispute-timeline ${daysInfo.urgent ? 'urgent' : ''}">
          <i data-lucide="${daysInfo.icon}"></i>
          <span>${daysInfo.text}</span>
        </div>
        ` : ''}
        
        <div class="dispute-card-actions">
          ${this.renderDisputeActions(dispute)}
        </div>
      </div>
    `;
  },
  
  renderDisputeActions(dispute) {
    const actions = [];
    
    // View letter
    actions.push(`<button class="btn btn-sm btn-ghost" onclick="MyLetters.viewLetter('${dispute.id}')">
      <i data-lucide="eye"></i> View
    </button>`);
    
    // Status-specific actions
    if (dispute.status === 'DRAFT') {
      actions.push(`<button class="btn btn-sm btn-primary" onclick="MyLetters.markAsMailed('${dispute.id}')">
        <i data-lucide="send"></i> Mark Mailed
      </button>`);
    } else if (dispute.status === 'MAILED' || dispute.status === 'AWAITING_RESPONSE') {
      actions.push(`<button class="btn btn-sm btn-primary" onclick="MyLetters.showLogResponseModal('${dispute.id}')">
        <i data-lucide="message-square"></i> Log Response
      </button>`);
    } else if (dispute.status === 'RESPONSE_RECEIVED') {
      actions.push(`<button class="btn btn-sm btn-primary" onclick="MyLetters.showRecordOutcomeModal('${dispute.id}')">
        <i data-lucide="check-circle"></i> Record Outcome
      </button>`);
    }
    
    // More options
    actions.push(`<button class="btn btn-sm btn-ghost" onclick="MyLetters.showMoreOptions('${dispute.id}')">
      <i data-lucide="more-horizontal"></i>
    </button>`);
    
    return actions.join('');
  },
  
  getStatusInfo(status) {
    const statuses = {
      DRAFT: { label: 'Draft', icon: 'edit-3', class: 'draft' },
      MAILED: { label: 'Mailed', icon: 'send', class: 'mailed' },
      AWAITING_RESPONSE: { label: 'Awaiting Response', icon: 'clock', class: 'pending' },
      RESPONSE_RECEIVED: { label: 'Response Received', icon: 'mail', class: 'response' },
      SUCCESSFUL: { label: 'Successful', icon: 'check-circle', class: 'success' },
      PARTIAL: { label: 'Partial Success', icon: 'check', class: 'partial' },
      UNSUCCESSFUL: { label: 'Unsuccessful', icon: 'x-circle', class: 'failed' },
    };
    return statuses[status] || { label: status, icon: 'circle', class: 'default' };
  },
  
  getDaysInfo(dispute) {
    if (dispute.status === 'MAILED' || dispute.status === 'AWAITING_RESPONSE') {
      if (dispute.responseDueDate) {
        const due = new Date(dispute.responseDueDate);
        const now = new Date();
        const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        
        if (days < 0) {
          return { text: `${Math.abs(days)} days overdue`, icon: 'alert-triangle', urgent: true };
        } else if (days <= 7) {
          return { text: `${days} days until response due`, icon: 'clock', urgent: true };
        } else {
          return { text: `Response due ${this.formatDate(due)}`, icon: 'calendar', urgent: false };
        }
      } else if (dispute.mailedAt) {
        const mailed = new Date(dispute.mailedAt);
        const days = Math.ceil((new Date() - mailed) / (1000 * 60 * 60 * 24));
        return { text: `Mailed ${days} days ago`, icon: 'send', urgent: false };
      }
    }
    return null;
  },
  
  updateStats() {
    const drafts = this.state.disputes.filter(d => d.status === 'DRAFT').length;
    const pending = this.state.disputes.filter(d => ['MAILED', 'AWAITING_RESPONSE'].includes(d.status)).length;
    const responded = this.state.disputes.filter(d => d.status === 'RESPONSE_RECEIVED').length;
    const successful = this.state.disputes.filter(d => d.status === 'SUCCESSFUL').length;
    
    const statsEl = document.getElementById('disputeStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-item" data-filter="all">
          <span class="stat-value">${this.state.disputes.length}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item" data-filter="drafts">
          <span class="stat-value">${drafts}</span>
          <span class="stat-label">Drafts</span>
        </div>
        <div class="stat-item" data-filter="mailed">
          <span class="stat-value">${pending}</span>
          <span class="stat-label">Pending</span>
        </div>
        <div class="stat-item" data-filter="responded">
          <span class="stat-value">${responded}</span>
          <span class="stat-label">Responded</span>
        </div>
        <div class="stat-item success" data-filter="completed">
          <span class="stat-value">${successful}</span>
          <span class="stat-label">Wins</span>
        </div>
      `;
      
      // Add click handlers
      statsEl.querySelectorAll('.stat-item').forEach(item => {
        item.addEventListener('click', () => {
          this.state.filter = item.dataset.filter;
          this.renderDisputes();
          this.updateFilterUI();
        });
      });
    }
  },

  // ===========================================
  // ACTIONS
  // ===========================================
  
  async viewLetter(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    if (!dispute) return;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'letterModal';
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3>${dispute.negativeItem?.creditorName || 'Dispute Letter'}</h3>
          <button class="btn-icon" onclick="MyLetters.closeModal('letterModal')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="letter-meta">
            <span class="letter-meta-item">
              <i data-lucide="building-2"></i>
              ${dispute.bureau}
            </span>
            <span class="letter-meta-item">
              <i data-lucide="file-text"></i>
              ${this.formatLetterType(dispute.letterType)}
            </span>
            <span class="letter-meta-item">
              <i data-lucide="calendar"></i>
              Created ${this.formatDate(dispute.createdAt)}
            </span>
          </div>
          <div class="letter-content">
            <pre>${dispute.letterContent || 'Letter content not available.'}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="MyLetters.closeModal('letterModal')">Close</button>
          <button class="btn btn-outline" onclick="MyLetters.copyLetter('${disputeId}')">
            <i data-lucide="copy"></i> Copy
          </button>
          <button class="btn btn-primary" onclick="MyLetters.downloadLetter('${disputeId}')">
            <i data-lucide="download"></i> Download
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },
  
  async markAsMailed(disputeId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'mailedModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Mark as Mailed</h3>
          <button class="btn-icon" onclick="MyLetters.closeModal('mailedModal')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Date Mailed</label>
            <input type="date" id="mailedDate" value="${new Date().toISOString().split('T')[0]}" class="form-input">
          </div>
          <div class="form-group">
            <label>Tracking Number (Optional)</label>
            <input type="text" id="trackingNumber" placeholder="USPS, FedEx, etc." class="form-input">
          </div>
          <div class="form-tip">
            <i data-lucide="info"></i>
            <span>The bureau has 30-45 days to respond once they receive your letter.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="MyLetters.closeModal('mailedModal')">Cancel</button>
          <button class="btn btn-primary" onclick="MyLetters.confirmMailed('${disputeId}')">
            <i data-lucide="send"></i> Confirm Mailed
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },
  
  async confirmMailed(disputeId) {
    const mailedDate = document.getElementById('mailedDate').value;
    const trackingNumber = document.getElementById('trackingNumber').value;
    
    try {
      const response = await API.disputes.markMailed(disputeId, {
        mailedAt: mailedDate,
        trackingNumber: trackingNumber || null,
      });
      
      if (response.ok) {
        this.closeModal('mailedModal');
        this.showToast('Letter marked as mailed!', 'success');
        await this.loadData();
      } else {
        throw new Error(response.data?.error || 'Failed to update');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },
  
  showLogResponseModal(disputeId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'responseModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Log Bureau Response</h3>
          <button class="btn-icon" onclick="MyLetters.closeModal('responseModal')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Response Date</label>
            <input type="date" id="responseDate" value="${new Date().toISOString().split('T')[0]}" class="form-input">
          </div>
          <div class="form-group">
            <label>Response Type</label>
            <select id="responseType" class="form-select">
              <option value="INVESTIGATION_COMPLETE">Investigation Complete</option>
              <option value="VERIFIED">Item Verified</option>
              <option value="DELETED">Item Deleted</option>
              <option value="UPDATED">Item Updated/Modified</option>
              <option value="FRIVOLOUS">Deemed Frivolous</option>
              <option value="NEED_MORE_INFO">Need More Information</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes (Optional)</label>
            <textarea id="responseNotes" rows="3" class="form-textarea" placeholder="Any details from the response letter..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="MyLetters.closeModal('responseModal')">Cancel</button>
          <button class="btn btn-primary" onclick="MyLetters.confirmResponse('${disputeId}')">
            <i data-lucide="check"></i> Log Response
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },
  
  async confirmResponse(disputeId) {
    const responseDate = document.getElementById('responseDate').value;
    const responseType = document.getElementById('responseType').value;
    const notes = document.getElementById('responseNotes').value;
    
    try {
      const response = await API.disputes.logResponse(disputeId, {
        responseReceivedAt: responseDate,
        responseType,
        responseNotes: notes || null,
      });
      
      if (response.ok) {
        this.closeModal('responseModal');
        this.showToast('Response logged!', 'success');
        await this.loadData();
      } else {
        throw new Error(response.data?.error || 'Failed to log response');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },
  
  showRecordOutcomeModal(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'outcomeModal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Record Outcome</h3>
          <button class="btn-icon" onclick="MyLetters.closeModal('outcomeModal')">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-description">What was the final result of this dispute?</p>
          
          <div class="outcome-options">
            <button class="outcome-option success" data-outcome="SUCCESSFUL" onclick="MyLetters.selectOutcome(this)">
              <i data-lucide="check-circle"></i>
              <span>Item Deleted</span>
              <p>The negative item was fully removed from your report</p>
            </button>
            <button class="outcome-option partial" data-outcome="PARTIAL" onclick="MyLetters.selectOutcome(this)">
              <i data-lucide="check"></i>
              <span>Partial Success</span>
              <p>The item was updated or partially removed</p>
            </button>
            <button class="outcome-option failed" data-outcome="UNSUCCESSFUL" onclick="MyLetters.selectOutcome(this)">
              <i data-lucide="x-circle"></i>
              <span>Unsuccessful</span>
              <p>The bureau verified the item or denied the dispute</p>
            </button>
          </div>
          
          <div class="form-group" id="debtEliminatedGroup" style="display: none;">
            <label>Debt Amount Eliminated</label>
            <input type="number" id="debtEliminated" class="form-input" placeholder="0.00" step="0.01">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="MyLetters.closeModal('outcomeModal')">Cancel</button>
          <button class="btn btn-primary" id="confirmOutcomeBtn" onclick="MyLetters.confirmOutcome('${disputeId}')" disabled>
            <i data-lucide="check"></i> Record Outcome
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  },
  
  selectOutcome(btn) {
    document.querySelectorAll('.outcome-option').forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('confirmOutcomeBtn').disabled = false;
    
    // Show debt eliminated field for successful outcomes
    const debtGroup = document.getElementById('debtEliminatedGroup');
    if (btn.dataset.outcome === 'SUCCESSFUL' || btn.dataset.outcome === 'PARTIAL') {
      debtGroup.style.display = 'block';
    } else {
      debtGroup.style.display = 'none';
    }
  },
  
  async confirmOutcome(disputeId) {
    const selectedOption = document.querySelector('.outcome-option.selected');
    if (!selectedOption) return;
    
    const outcome = selectedOption.dataset.outcome;
    const debtEliminated = parseFloat(document.getElementById('debtEliminated')?.value) || 0;
    
    try {
      const response = await API.disputes.recordOutcome(disputeId, {
        outcome,
        debtEliminated: outcome === 'SUCCESSFUL' || outcome === 'PARTIAL' ? debtEliminated : 0,
      });
      
      if (response.ok) {
        this.closeModal('outcomeModal');
        
        if (outcome === 'SUCCESSFUL') {
          this.showToast('🎉 Congratulations! Item deleted!', 'success');
        } else if (outcome === 'PARTIAL') {
          this.showToast('Partial success recorded', 'success');
        } else {
          this.showToast('Outcome recorded', 'info');
        }
        
        await this.loadData();
      } else {
        throw new Error(response.data?.error || 'Failed to record outcome');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },
  
  showMoreOptions(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    if (!dispute) return;
    
    const options = [];
    
    // Regenerate letter
    options.push({ label: 'Regenerate Letter', icon: 'refresh-cw', action: () => this.regenerateLetter(disputeId) });
    
    // Send follow-up (if mailed and past due)
    if (['MAILED', 'AWAITING_RESPONSE', 'RESPONSE_RECEIVED'].includes(dispute.status)) {
      options.push({ label: 'Create Follow-up', icon: 'reply', action: () => this.createFollowUp(disputeId) });
    }
    
    // Delete
    options.push({ label: 'Delete Dispute', icon: 'trash-2', action: () => this.deleteDispute(disputeId), danger: true });
    
    // Create dropdown
    const card = document.querySelector(`[data-dispute-id="${disputeId}"]`);
    const existingDropdown = document.querySelector('.options-dropdown');
    if (existingDropdown) existingDropdown.remove();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'options-dropdown';
    dropdown.innerHTML = options.map(opt => `
      <button class="dropdown-item ${opt.danger ? 'danger' : ''}" onclick="(${opt.action.toString()})()">
        <i data-lucide="${opt.icon}"></i>
        <span>${opt.label}</span>
      </button>
    `).join('');
    
    card.appendChild(dropdown);
    if (window.lucide) lucide.createIcons();
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 100);
  },
  
  async regenerateLetter(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    if (!dispute) return;
    
    this.showToast('Regenerating letter...', 'info');
    
    try {
      const response = await API.letters.regenerate({
        negativeItemId: dispute.negativeItemId,
        letterType: dispute.letterType,
        target: dispute.target,
        bureau: dispute.bureau,
      });
      
      if (response.ok) {
        this.showToast('Letter regenerated!', 'success');
        await this.loadData();
      }
    } catch (error) {
      this.showToast('Failed to regenerate', 'error');
    }
  },
  
  async createFollowUp(disputeId) {
    // Navigate to engine with follow-up context
    window.location.href = `engine-v2.html?followup=${disputeId}`;
  },
  
  async deleteDispute(disputeId) {
    if (!confirm('Are you sure you want to delete this dispute? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await API.disputes.delete(disputeId);
      if (response.ok) {
        this.showToast('Dispute deleted', 'info');
        await this.loadData();
      }
    } catch (error) {
      this.showToast('Failed to delete', 'error');
    }
  },
  
  copyLetter(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    if (!dispute?.letterContent) {
      this.showToast('No letter content to copy', 'error');
      return;
    }
    
    navigator.clipboard.writeText(dispute.letterContent).then(() => {
      this.showToast('Letter copied to clipboard!', 'success');
    });
  },
  
  downloadLetter(disputeId) {
    const dispute = this.state.disputes.find(d => d.id === disputeId);
    if (!dispute?.letterContent) {
      this.showToast('No letter content to download', 'error');
      return;
    }
    
    const blob = new Blob([dispute.letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute_${dispute.negativeItem?.creditorName?.replace(/\s+/g, '_') || 'letter'}_${dispute.bureau}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Letter downloaded!', 'success');
  },
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
  },

  // ===========================================
  // FILTERS & SEARCH
  // ===========================================
  
  initFilters() {
    const filterBtns = document.querySelectorAll('[data-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.filter = btn.dataset.filter;
        this.updateFilterUI();
        this.renderDisputes();
      });
    });
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.state.sortBy = sortSelect.value;
        this.renderDisputes();
      });
    }
  },
  
  updateFilterUI() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.state.filter);
    });
  },
  
  initSearch() {
    const searchInput = document.getElementById('letterSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        this.renderDisputes();
      });
    }
  },
  
  clearFilters() {
    this.state.filter = 'all';
    this.state.searchQuery = '';
    const searchInput = document.getElementById('letterSearch');
    if (searchInput) searchInput.value = '';
    this.updateFilterUI();
    this.renderDisputes();
  },

  // ===========================================
  // UI HELPERS
  // ===========================================
  
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }
    
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },
  
  initModals() {
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
      }
    });
  },
  
  showLoading() {
    const container = document.getElementById('disputesContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading disputes...</p>
        </div>
      `;
    }
  },
  
  hideLoading() {
    // Loading is replaced by render
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

  // ===========================================
  // FORMATTING
  // ===========================================
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  },
  
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },
  
  formatAccountType(type) {
    const types = {
      COLLECTION: 'Collection',
      CHARGE_OFF: 'Charge-Off',
      LATE_PAYMENT: 'Late Payment',
      MEDICAL: 'Medical',
      INQUIRY: 'Inquiry',
    };
    return types[type] || type || 'Unknown';
  },
  
  formatLetterType(type) {
    const types = {
      INITIAL_DISPUTE: 'Initial Dispute',
      DEBT_VALIDATION: 'Debt Validation',
      METHOD_OF_VERIFICATION: 'Method of Verification',
      INTENT_TO_SUE: 'Intent to Sue',
      GOODWILL: 'Goodwill Request',
      PAY_FOR_DELETE: 'Pay for Delete',
    };
    return types[type] || type || 'Dispute Letter';
  },
};

// Make globally available
window.MyLetters = MyLetters;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => MyLetters.init());

// Add styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  .dispute-card {
    background: var(--dark-800);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    border: 1px solid var(--dark-700);
    transition: all 0.2s;
  }
  
  .dispute-card:hover {
    border-color: var(--dark-600);
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }
  
  .dispute-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .dispute-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .dispute-status-badge i {
    width: 14px;
    height: 14px;
  }
  
  .dispute-status-badge.draft { background: rgba(156, 163, 175, 0.2); color: #9ca3af; }
  .dispute-status-badge.mailed { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
  .dispute-status-badge.pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .dispute-status-badge.response { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
  .dispute-status-badge.success { background: rgba(52, 211, 153, 0.2); color: #34d399; }
  .dispute-status-badge.partial { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
  .dispute-status-badge.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  
  .dispute-creditor {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.5rem;
  }
  
  .dispute-details {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .dispute-type {
    color: var(--dark-400);
    font-size: 0.875rem;
  }
  
  .dispute-amount {
    color: var(--accent-400);
    font-weight: 500;
  }
  
  .dispute-letter-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--dark-400);
    font-size: 0.8125rem;
  }
  
  .dispute-letter-type i {
    width: 14px;
    height: 14px;
  }
  
  .dispute-timeline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--dark-900);
    border-radius: 8px;
    margin: 1rem 0;
    font-size: 0.8125rem;
    color: var(--dark-300);
  }
  
  .dispute-timeline i {
    width: 16px;
    height: 16px;
  }
  
  .dispute-timeline.urgent {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }
  
  .dispute-card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--dark-700);
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }
  
  .empty-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    background: var(--dark-800);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .empty-icon i {
    width: 40px;
    height: 40px;
    color: var(--dark-500);
  }
  
  .empty-state h3 {
    color: #fff;
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: var(--dark-400);
    margin-bottom: 1.5rem;
  }
  
  .loading-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--dark-400);
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--dark-700);
    border-top-color: var(--accent-500);
    border-radius: 50%;
    margin: 0 auto 1rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Modal styles */
  .modal-overlay {
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
  
  .modal-content {
    background: var(--dark-900);
    border-radius: 16px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-content.large {
    max-width: 700px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--dark-700);
  }
  
  .modal-header h3 {
    margin: 0;
    color: #fff;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--dark-700);
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--dark-800);
    border: 1px solid var(--dark-700);
    border-radius: 8px;
    color: #fff;
    font-size: 0.875rem;
  }
  
  .form-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    font-size: 0.8125rem;
    color: var(--dark-300);
  }
  
  .form-tip i {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: #818cf8;
  }
  
  .letter-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .letter-meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--dark-400);
    font-size: 0.8125rem;
  }
  
  .letter-meta-item i {
    width: 14px;
    height: 14px;
  }
  
  .letter-content {
    background: var(--dark-800);
    border-radius: 8px;
    padding: 1rem;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .letter-content pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: inherit;
    color: var(--dark-300);
    font-size: 0.875rem;
    line-height: 1.6;
  }
  
  .outcome-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }
  
  .outcome-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    background: var(--dark-800);
    border: 2px solid var(--dark-700);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  
  .outcome-option:hover {
    border-color: var(--dark-600);
  }
  
  .outcome-option.selected {
    border-color: var(--accent-500);
    background: rgba(52, 211, 153, 0.1);
  }
  
  .outcome-option i {
    width: 24px;
    height: 24px;
    margin-bottom: 0.5rem;
  }
  
  .outcome-option.success i { color: #34d399; }
  .outcome-option.partial i { color: #a78bfa; }
  .outcome-option.failed i { color: #f87171; }
  
  .outcome-option span {
    color: #fff;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .outcome-option p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--dark-400);
  }
  
  .options-dropdown {
    position: absolute;
    right: 1rem;
    top: 100%;
    background: var(--dark-800);
    border: 1px solid var(--dark-700);
    border-radius: 8px;
    padding: 0.5rem;
    min-width: 160px;
    z-index: 100;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: none;
    border: none;
    color: var(--dark-300);
    font-size: 0.875rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .dropdown-item:hover {
    background: var(--dark-700);
    color: #fff;
  }
  
  .dropdown-item.danger:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  
  .dropdown-item i {
    width: 16px;
    height: 16px;
  }
  
  #disputeStats {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .stat-item {
    padding: 0.75rem 1.25rem;
    background: var(--dark-800);
    border: 1px solid var(--dark-700);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    min-width: 80px;
  }
  
  .stat-item:hover {
    border-color: var(--dark-600);
  }
  
  .stat-item.active {
    border-color: var(--accent-500);
    background: rgba(52, 211, 153, 0.1);
  }
  
  .stat-item.success .stat-value {
    color: var(--accent-400);
  }
  
  .stat-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 600;
    color: #fff;
  }
  
  .stat-label {
    display: block;
    font-size: 0.75rem;
    color: var(--dark-400);
  }
  
  .bureau-tag {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .bureau-tag.equifax { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  .bureau-tag.experian { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
  .bureau-tag.transunion { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
`;
document.head.appendChild(style);

console.log('CreditHopper My Letters loaded');
