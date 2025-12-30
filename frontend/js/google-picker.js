/* ============================================
   CREDITHOPPER - GOOGLE DRIVE PICKER SERVICE
   Allows users to select credit reports from Google Drive
   ============================================ */

/**
 * Google Picker Service
 * 
 * SETUP REQUIRED:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com
 * 2. Create a new project (or use existing - SAME as Google Sign-In)
 * 3. Enable these APIs:
 *    - Google Drive API
 *    - Google Picker API
 * 4. Use the SAME OAuth 2.0 credentials as Google Sign-In
 *    - Add 'https://www.googleapis.com/auth/drive.readonly' to your OAuth consent screen scopes
 * 5. Create API Key (for Picker API only)
 * 6. Replace the placeholder values below with your credentials
 * 
 * IMPORTANT: Use the same CLIENT_ID as your Google Sign-In for seamless experience
 */

const GooglePickerService = {
  // ============================================
  // CONFIGURATION - REPLACE THESE VALUES
  // ============================================
  
  // Your Google Cloud project's OAuth Client ID
  // MUST BE THE SAME as your Google Sign-In CLIENT_ID for seamless auth
  // Get this from: Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs
  CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  
  // Your API Key for the Picker API (separate from OAuth)
  // Get this from: Google Cloud Console > APIs & Services > Credentials > API Keys
  API_KEY: 'YOUR_API_KEY',
  
  // App ID (numeric project number)
  // Get this from: Google Cloud Console > Project Settings
  APP_ID: 'YOUR_APP_ID',
  
  // Required scopes for Drive access
  // Note: This is an ADDITIONAL scope beyond what's needed for sign-in
  SCOPES: 'https://www.googleapis.com/auth/drive.readonly',
  
  // Picker view modes
  VIEWS: {
    DOCS: 'docs',           // All documents
    PDFS: 'pdfs',           // PDFs only
    IMAGES: 'images',       // Images only
    ALL: 'all'              // All file types
  },

  // ============================================
  // STATE
  // ============================================
  
  isGapiLoaded: false,
  isGisLoaded: false,
  isPickerApiLoaded: false,
  tokenClient: null,
  accessToken: null,
  pickerCallback: null,
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  /**
   * Initialize the Google Picker service
   * Call this on page load
   */
  async init() {
    console.log('[GooglePicker] Initializing...');
    
    // Validate configuration
    if (this.CLIENT_ID.includes('YOUR_')) {
      console.error('[GooglePicker] ERROR: You must configure your Google Cloud credentials!');
      console.error('[GooglePicker] See setup instructions at the top of google-picker.js');
      return false;
    }
    
    try {
      // Load Google APIs in parallel
      await Promise.all([
        this.loadGapiScript(),
        this.loadGisScript()
      ]);
      
      console.log('[GooglePicker] All scripts loaded successfully');
      return true;
      
    } catch (error) {
      console.error('[GooglePicker] Failed to initialize:', error);
      return false;
    }
  },
  
  /**
   * Load the Google API client library (gapi)
   */
  loadGapiScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gapi && this.isGapiLoaded) {
        resolve();
        return;
      }
      
      // Check if script tag already exists
      if (document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
        // Script exists, wait for it to load
        const checkLoaded = setInterval(() => {
          if (window.gapi) {
            clearInterval(checkLoaded);
            this.onGapiLoaded().then(resolve).catch(reject);
          }
        }, 100);
        return;
      }
      
      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[GooglePicker] GAPI script loaded');
        this.onGapiLoaded().then(resolve).catch(reject);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google API script'));
      };
      
      document.head.appendChild(script);
    });
  },
  
  /**
   * Called when gapi script loads
   */
  async onGapiLoaded() {
    return new Promise((resolve, reject) => {
      gapi.load('picker', {
        callback: () => {
          console.log('[GooglePicker] Picker API loaded');
          this.isGapiLoaded = true;
          this.isPickerApiLoaded = true;
          resolve();
        },
        onerror: () => {
          reject(new Error('Failed to load Picker API'));
        }
      });
    });
  },
  
  /**
   * Load the Google Identity Services library (GIS)
   */
  loadGisScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.accounts?.oauth2 && this.isGisLoaded) {
        resolve();
        return;
      }
      
      // Check if script tag already exists
      if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const checkLoaded = setInterval(() => {
          if (window.google?.accounts?.oauth2) {
            clearInterval(checkLoaded);
            this.onGisLoaded();
            resolve();
          }
        }, 100);
        return;
      }
      
      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[GooglePicker] GIS script loaded');
        this.onGisLoaded();
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'));
      };
      
      document.head.appendChild(script);
    });
  },
  
  /**
   * Called when GIS script loads
   */
  onGisLoaded() {
    this.isGisLoaded = true;
    
    // Initialize the token client with Drive scope
    // Using the same CLIENT_ID as sign-in means Google will recognize the user
    // and may not need to show the consent screen again
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response) => this.handleTokenResponse(response),
      // Use 'select_account' to let user choose which account
      // This matches the sign-in flow experience
      hint: this.getLoggedInUserEmail(),
    });
    
    console.log('[GooglePicker] Token client initialized');
  },
  
  /**
   * Get the email of the currently logged-in user (if available)
   * This helps Google pre-select the right account
   */
  getLoggedInUserEmail() {
    // Try to get email from localStorage (set during login)
    return localStorage.getItem('credithopper_user_email') || '';
  },
  
  // ============================================
  // TOKEN MANAGEMENT
  // ============================================
  
  /**
   * Handle the OAuth token response
   */
  handleTokenResponse(response) {
    if (response.error) {
      console.error('[GooglePicker] Token error:', response.error);
      
      if (this.pickerCallback) {
        this.pickerCallback({
          success: false,
          error: response.error === 'access_denied' 
            ? 'Access denied. Please allow Google Drive access to select files.'
            : 'Failed to authenticate with Google. Please try again.'
        });
        this.pickerCallback = null;
      }
      return;
    }
    
    console.log('[GooglePicker] Access token received');
    this.accessToken = response.access_token;
    
    // Now that we have a token, show the picker
    this.showPicker();
  },
  
  /**
   * Request an access token (will prompt user if needed)
   */
  requestAccessToken() {
    if (!this.tokenClient) {
      console.error('[GooglePicker] Token client not initialized');
      return;
    }
    
    // Check if we already have a valid token
    if (this.accessToken) {
      this.showPicker();
      return;
    }
    
    // Request a new token
    // If user is already signed in with Google (same CLIENT_ID),
    // they may not need to see a consent screen at all
    this.tokenClient.requestAccessToken({ 
      prompt: '',
      // Provide hint to pre-select the account
      hint: this.getLoggedInUserEmail(),
    });
  },
  
  /**
   * Revoke the current access token
   */
  revokeToken() {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('[GooglePicker] Token revoked');
        this.accessToken = null;
      });
    }
  },
  
  // ============================================
  // PICKER DISPLAY
  // ============================================
  
  /**
   * Open the Google Picker to select a file
   * @param {Object} options - Configuration options
   * @param {Function} options.onSelect - Callback when file is selected
   * @param {Function} options.onCancel - Callback when picker is cancelled
   * @param {String} options.viewMode - Which file types to show ('docs', 'pdfs', 'images', 'all')
   * @param {Boolean} options.multiSelect - Allow multiple file selection
   */
  async open(options = {}) {
    const {
      onSelect = () => {},
      onCancel = () => {},
      viewMode = 'pdfs',
      multiSelect = false
    } = options;
    
    console.log('[GooglePicker] Opening picker with options:', { viewMode, multiSelect });
    
    // Validate initialization
    if (!this.isGapiLoaded || !this.isGisLoaded) {
      const initialized = await this.init();
      if (!initialized) {
        onSelect({
          success: false,
          error: 'Google Picker is not configured. Please contact support.'
        });
        return;
      }
    }
    
    // Store callback and options for use after token is obtained
    this.pickerCallback = (result) => {
      if (result.success) {
        onSelect(result);
      } else if (result.cancelled) {
        onCancel();
      } else {
        onSelect(result);
      }
    };
    
    this.pickerOptions = { viewMode, multiSelect };
    
    // Request access token (will show picker once token is obtained)
    this.requestAccessToken();
  },
  
  /**
   * Create and display the picker
   */
  showPicker() {
    if (!this.accessToken) {
      console.error('[GooglePicker] No access token available');
      return;
    }
    
    if (!this.isPickerApiLoaded) {
      console.error('[GooglePicker] Picker API not loaded');
      return;
    }
    
    const { viewMode = 'pdfs', multiSelect = false } = this.pickerOptions || {};
    
    try {
      // Create the appropriate view based on viewMode
      let view;
      
      switch (viewMode) {
        case 'pdfs':
          // PDF files only
          view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes('application/pdf')
            .setMode(google.picker.DocsViewMode.LIST);
          break;
          
        case 'images':
          // Image files only
          view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes('image/png,image/jpeg,image/jpg')
            .setMode(google.picker.DocsViewMode.GRID);
          break;
          
        case 'docs':
          // All Google Docs + PDFs
          view = new google.picker.DocsView()
            .setIncludeFolders(true)
            .setMode(google.picker.DocsViewMode.LIST);
          break;
          
        case 'all':
        default:
          // All files (PDFs and images for credit reports)
          view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes('application/pdf,image/png,image/jpeg,image/jpg')
            .setMode(google.picker.DocsViewMode.LIST);
          break;
      }
      
      // Build the picker
      const pickerBuilder = new google.picker.PickerBuilder()
        .setAppId(this.APP_ID)
        .setOAuthToken(this.accessToken)
        .setDeveloperKey(this.API_KEY)
        .addView(view)
        .setCallback((data) => this.handlePickerCallback(data))
        .setTitle('Select Credit Report from Google Drive')
        .setLocale('en');
      
      // Enable multi-select if requested
      if (multiSelect) {
        pickerBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      }
      
      // Add "My Drive" as a root
      pickerBuilder.enableFeature(google.picker.Feature.NAV_HIDDEN);
      
      // Build and show
      const picker = pickerBuilder.build();
      picker.setVisible(true);
      
      console.log('[GooglePicker] Picker displayed');
      
    } catch (error) {
      console.error('[GooglePicker] Failed to create picker:', error);
      
      if (this.pickerCallback) {
        this.pickerCallback({
          success: false,
          error: 'Failed to open file picker. Please try again.'
        });
        this.pickerCallback = null;
      }
    }
  },
  
  /**
   * Handle picker callback
   */
  handlePickerCallback(data) {
    console.log('[GooglePicker] Picker callback:', data.action);
    
    if (data.action === google.picker.Action.PICKED) {
      // User selected file(s)
      const files = data.docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        url: doc.url,
        iconUrl: doc.iconUrl,
        size: doc.sizeBytes,
        lastModified: doc.lastEditedUtc
      }));
      
      console.log('[GooglePicker] Files selected:', files);
      
      if (this.pickerCallback) {
        this.pickerCallback({
          success: true,
          files: files,
          accessToken: this.accessToken
        });
        this.pickerCallback = null;
      }
      
    } else if (data.action === google.picker.Action.CANCEL) {
      // User cancelled
      console.log('[GooglePicker] Picker cancelled');
      
      if (this.pickerCallback) {
        this.pickerCallback({ cancelled: true });
        this.pickerCallback = null;
      }
    }
  },
  
  // ============================================
  // FILE DOWNLOAD
  // ============================================
  
  /**
   * Download a file from Google Drive
   * @param {String} fileId - The Google Drive file ID
   * @param {String} accessToken - OAuth access token (optional, uses stored token)
   * @returns {Promise<Blob>} - The file as a Blob
   */
  async downloadFile(fileId, accessToken = null) {
    const token = accessToken || this.accessToken;
    
    if (!token) {
      throw new Error('No access token available. Please authenticate first.');
    }
    
    console.log('[GooglePicker] Downloading file:', fileId);
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('[GooglePicker] File downloaded, size:', blob.size);
      
      return blob;
      
    } catch (error) {
      console.error('[GooglePicker] Download failed:', error);
      throw error;
    }
  },
  
  /**
   * Download a file and convert to File object
   * @param {Object} fileInfo - File info from picker (must have id, name, mimeType)
   * @returns {Promise<File>} - The file as a File object
   */
  async downloadAsFile(fileInfo) {
    const blob = await this.downloadFile(fileInfo.id);
    return new File([blob], fileInfo.name, { type: fileInfo.mimeType });
  }
};

// ============================================
// AUTO-INITIALIZE
// ============================================

// Initialize when DOM is ready (but don't block if credentials aren't set)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only auto-init if credentials are configured
    if (!GooglePickerService.CLIENT_ID.includes('YOUR_')) {
      GooglePickerService.init();
    }
  });
} else {
  if (!GooglePickerService.CLIENT_ID.includes('YOUR_')) {
    GooglePickerService.init();
  }
}

// Make available globally
window.GooglePickerService = GooglePickerService;

console.log('[GooglePicker] Service registered');
