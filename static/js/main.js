// BigQuery Release Pulse Client Logic

let releaseNotes = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Elements
const timelineFeed = document.getElementById('timeline-feed');
const skeletonLoader = document.getElementById('skeleton-loader');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const retryBtn = document.getElementById('retry-btn');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');

// Tweet Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetEditor = document.getElementById('tweet-editor');
const charCount = document.getElementById('char-count');
const tweetWarning = document.getElementById('tweet-warning');
const closeModalBtn = document.getElementById('close-modal-btn');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Listeners
function setupEventListeners() {
    // Action buttons
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    exportCsvBtn.addEventListener('click', exportToCSV);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    
    // Clear filters
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        setActiveFilter('all');
        renderTimeline();
    });
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTimeline();
    });
    
    // Category filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveFilter(btn.dataset.filter);
            renderTimeline();
        });
    });
    
    // Tweet modal close
    closeModalBtn.addEventListener('click', () => {
        tweetModal.classList.remove('active');
        selectedUpdate = null;
    });
    
    // Tweet modal text check
    tweetEditor.addEventListener('input', updateCharCount);
    
    // Copy tweet content
    copyTweetBtn.addEventListener('click', () => {
        const text = tweetEditor.value;
        copyToClipboard(text, 'Tweet content copied to clipboard!');
    });
    
    // Send Tweet to Twitter
    sendTweetBtn.addEventListener('click', () => {
        const text = tweetEditor.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        tweetModal.classList.remove('active');
        showToast('Redirected to share on X/Twitter!', 'success');
    });
    
    // Close modal when clicking background overlay
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            tweetModal.classList.remove('active');
            selectedUpdate = null;
        }
    });
}

// Set active filter button styling
function setActiveFilter(filterName) {
    currentFilter = filterName;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filterName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Fetch notes from Flask backend API
async function fetchReleaseNotes() {
    // Start spinner animation
    const spinner = refreshBtn.querySelector('.spinner-icon');
    spinner.classList.add('loading');
    refreshBtn.disabled = true;
    
    // Show skeleton
    skeletonLoader.classList.remove('hidden');
    timelineFeed.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    try {
        const response = await fetch('/api/release-notes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        releaseNotes = data.entries || [];
        updateStats();
        renderTimeline();
        showToast('Release notes fetched successfully.', 'success');
    } catch (e) {
        console.error('Error fetching release notes:', e);
        errorMessage.textContent = e.message || 'Something went wrong while connecting to the feed.';
        errorState.classList.remove('hidden');
        showToast('Error refreshing release notes.', 'error');
    } finally {
        spinner.classList.remove('loading');
        refreshBtn.disabled = false;
        skeletonLoader.classList.add('hidden');
    }
}

// Update sidebar stats counts
function updateStats() {
    let total = 0;
    let features = 0;
    let issues = 0;
    let changes = 0;
    
    releaseNotes.forEach(entry => {
        entry.updates.forEach(up => {
            total++;
            const type = up.type.toLowerCase();
            if (type.includes('feature')) features++;
            else if (type.includes('issue') || type.includes('bug')) issues++;
            else if (type.includes('change') || type.includes('update')) changes++;
        });
    });
    
    document.querySelector('[data-stat="total"] .stat-num').textContent = total;
    document.querySelector('[data-stat="feature"] .stat-num').textContent = features;
    document.querySelector('[data-stat="issue"] .stat-num').textContent = issues;
    document.querySelector('[data-stat="change"] .stat-num').textContent = changes;
}

// Filter and render release timeline
function renderTimeline() {
    timelineFeed.innerHTML = '';
    
    let hasMatchingContent = false;
    
    releaseNotes.forEach(entry => {
        // Filter updates inside this entry
        const filteredUpdates = entry.updates.filter(update => {
            // Category check
            const categoryMatch = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
                
            // Search keyword check
            const searchMatch = !searchQuery || 
                update.type.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);
                
            return categoryMatch && searchMatch;
        });
        
        if (filteredUpdates.length > 0) {
            hasMatchingContent = true;
            
            // Create group element
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            // Create date title
            dateGroup.innerHTML = `
                <div class="date-badge-wrapper">
                    <div class="timeline-dot"></div>
                </div>
                <h2 class="date-title">${entry.date}</h2>
                <div class="update-cards-container"></div>
            `;
            
            const cardContainer = dateGroup.querySelector('.update-cards-container');
            
            // Create cards
            filteredUpdates.forEach(update => {
                const card = document.createElement('div');
                card.className = 'update-card';
                card.id = `card-${update.id}`;
                
                // Determine CSS badge class
                const safeType = ['Feature', 'Issue', 'Change', 'Deprecation'].includes(update.type) ? update.type : 'Other';
                
                card.innerHTML = `
                    <div class="badge-header">
                        <span class="type-badge type-${safeType}">${update.type}</span>
                    </div>
                    <div class="update-body">${update.html}</div>
                    <div class="card-actions">
                        <button class="action-icon-btn btn-copy-link" data-link="${entry.link || ''}">
                            <i class="fa-solid fa-link"></i> Copy Link
                        </button>
                        <button class="action-icon-btn btn-copy-clipboard" data-id="${update.id}">
                            <i class="fa-solid fa-clipboard"></i> Copy to Clipboard
                        </button>
                        <button class="action-icon-btn btn-share-tweet" data-id="${update.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                `;
                
                // Event listener bindings for actions
                card.querySelector('.btn-copy-link').addEventListener('click', (e) => {
                    const link = e.currentTarget.dataset.link;
                    copyToClipboard(link || window.location.href, 'Link copied to clipboard!');
                });
                
                card.querySelector('.btn-copy-clipboard').addEventListener('click', () => {
                    const fullFormattedNote = `BigQuery [${update.type}] (${entry.date}): ${update.text}\n\nRead more at: ${entry.link || 'https://cloud.google.com/bigquery'}`;
                    copyToClipboard(fullFormattedNote, 'Formatted release note copied to clipboard!');
                });
                
                card.querySelector('.btn-share-tweet').addEventListener('click', () => {
                    openTweetModal(update, entry.date, entry.link);
                });
                
                cardContainer.appendChild(card);
            });
            
            timelineFeed.appendChild(dateGroup);
        }
    });
    
    // Toggle feed vs empty state
    if (hasMatchingContent) {
        timelineFeed.classList.remove('hidden');
        emptyState.classList.add('hidden');
    } else {
        timelineFeed.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

// Open tweet composer with preformatted details
function openTweetModal(update, date, link) {
    selectedUpdate = update;
    
    // Compose smart tweet under 280 chars
    // Format: BigQuery [Type] (Date): Content... Link
    const typeLabel = `BigQuery [${update.type}] (${date}): `;
    const linkLabel = `\n\nRead more: ${link || 'https://cloud.google.com/bigquery'}`;
    
    const maxContentLen = 280 - typeLabel.length - linkLabel.length - 4; // 4 chars buffer for "..."
    let displayContent = update.text;
    
    if (displayContent.length > maxContentLen) {
        displayContent = displayContent.substring(0, maxContentLen).trim() + '...';
    }
    
    const tweetText = `${typeLabel}${displayContent}${linkLabel}`;
    
    tweetEditor.value = tweetText;
    updateCharCount();
    
    tweetModal.classList.add('active');
    tweetEditor.focus();
    // Select text to allow immediate edit
    tweetEditor.setSelectionRange(typeLabel.length, typeLabel.length + displayContent.length);
}

// Update char count indicator
function updateCharCount() {
    const text = tweetEditor.value;
    const len = text.length;
    charCount.textContent = len;
    
    // Handle coloring / warning states
    charCount.classList.remove('warning', 'danger');
    tweetWarning.classList.add('hidden');
    
    if (len > 280) {
        charCount.classList.add('danger');
        tweetWarning.classList.remove('hidden');
        sendTweetBtn.disabled = true;
    } else if (len > 250) {
        charCount.classList.add('warning');
        sendTweetBtn.disabled = false;
    } else {
        sendTweetBtn.disabled = false;
    }
}

// Copy to Clipboard Utility
function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage, 'success');
    }).catch(err => {
        console.error('Clipboard copy failed:', err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage, 'success');
        } catch (e) {
            showToast('Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(textarea);
    });
}

// Dynamic Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === 'success' ? 'fa-solid fa-circle-check text-success' : 'fa-solid fa-circle-exclamation text-danger';
    
    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Fade out and remove after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.3s ease reverse forwards';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3200);
}

// Export active/filtered release notes to CSV file
function exportToCSV() {
    if (!releaseNotes || releaseNotes.length === 0) {
        showToast('No release notes available to export.', 'error');
        return;
    }

    const csvRows = [];
    
    // CSV Header row
    csvRows.push(['Date', 'Type', 'Description', 'Link'].map(header => `"${header.replace(/"/g, '""')}"`).join(','));

    let count = 0;
    
    releaseNotes.forEach(entry => {
        entry.updates.forEach(update => {
            // Apply current filters dynamically to export exactly what the user sees
            const categoryMatch = currentFilter === 'all' || 
                update.type.toLowerCase() === currentFilter.toLowerCase();
            const searchMatch = !searchQuery || 
                update.type.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery) ||
                entry.date.toLowerCase().includes(searchQuery);

            if (categoryMatch && searchMatch) {
                count++;
                const row = [
                    entry.date,
                    update.type,
                    update.text,
                    entry.link || 'https://cloud.google.com/bigquery'
                ];
                // Escape double quotes in CSV fields
                const escapedRow = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
                csvRows.push(escapedRow.join(','));
            }
        });
    });

    if (count === 0) {
        showToast('No matching records found to export.', 'error');
        return;
    }

    // Create a UTF-8 CSV blob
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // \uFEFF is the UTF-8 Byte Order Mark (BOM) for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Successfully exported ${count} updates to CSV!`, 'success');
}
