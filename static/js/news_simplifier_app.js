// News Simplifier Frontend - Flask Integration
// Connects to Flask backend for real-time news fetching and simplification

// Configuration
const API_BASE_URL = 'http://localhost:5000';  // Change this to your production URL
let currentSimplificationLevel = 'basic';
let isSearching = false;
let currentSearchQuery = '';

// DOM Elements
const elements = {
    newsSearchInput: null,
    customText: null,
    customCharCount: null,
    loadingOverlay: null,
    toastContainer: null,
    newsResults: null,
    articlesContainer: null,
    resultsCount: null,
    customTextResults: null,
    articleModal: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadTrendingTopics();
    updateCharCounter();
});

// Initialize DOM elements
function initializeElements() {
    elements.newsSearchInput = document.getElementById('newsSearchInput');
    elements.customText = document.getElementById('customText');
    elements.customCharCount = document.getElementById('customCharCount');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.toastContainer = document.getElementById('toastContainer');
    elements.newsResults = document.getElementById('newsResults');
    elements.articlesContainer = document.getElementById('articlesContainer');
    elements.resultsCount = document.getElementById('resultsCount');
    elements.customTextResults = document.getElementById('customTextResults');
    elements.articleModal = document.getElementById('articleModal');
}

// Setup Event Listeners
function setupEventListeners() {
    // Search input enter key
    if (elements.newsSearchInput) {
        elements.newsSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                searchNews();
            }
        });
    }
    
    // Custom text character counter
    if (elements.customText) {
        elements.customText.addEventListener('input', updateCharCounter);
    }
    
    // Simplification level buttons
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSimplificationLevel = this.getAttribute('data-level');
        });
    });
}

// Tab Switching Functions
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked nav tab
    event.target.classList.add('active');
}

// Character Counter for Custom Text
function updateCharCounter() {
    if (elements.customText && elements.customCharCount) {
        const count = elements.customText.value.length;
        elements.customCharCount.textContent = count;
        
        if (count > 10000) {
            elements.customCharCount.style.color = 'var(--color-error)';
        } else if (count > 9000) {
            elements.customCharCount.style.color = 'var(--color-warning)';
        } else {
            elements.customCharCount.style.color = 'var(--color-text-muted)';
        }
    }
}

// Load Trending Topics
async function loadTrendingTopics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/trending-topics`);
        const data = await response.json();
        
        if (data.trending_topics) {
            const trendingContainer = document.getElementById('trendingTopics');
            if (trendingContainer) {
                trendingContainer.innerHTML = data.trending_topics.slice(0, 8).map(topic => 
                    `<button class="trending-item" onclick="searchTrendingTopic('${topic}')">${topic}</button>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load trending topics:', error);
    }
}

// Search News Function
async function searchNews() {
    if (isSearching) return;
    
    const query = elements.newsSearchInput.value.trim();
    if (!query) {
        showToast('Please enter a search term', 'error');
        return;
    }
    
    currentSearchQuery = query;
    isSearching = true;
    showLoadingOverlay(true, 'Fetching Latest News...', 'Searching financial news sources and analyzing content...');
    
    try {
        // Simulate progress
        await simulateSearchProgress();
        
        const response = await fetch(`${API_BASE_URL}/api/search-news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                level: currentSimplificationLevel
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch news');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayNewsResults(data);
        showToast(`Found ${data.total_found} articles`, 'success');
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('Failed to fetch news. Please try again.', 'error');
        displayNoResults();
    } finally {
        isSearching = false;
        showLoadingOverlay(false);
    }
}

// Search Trending Topic
function searchTrendingTopic(topic) {
    elements.newsSearchInput.value = topic;
    searchNews();
}

// Simulate Search Progress
function simulateSearchProgress() {
    return new Promise((resolve) => {
        let progress = 0;
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const loadingDescription = document.getElementById('loadingDescription');
        
        const steps = [
            { progress: 25, message: 'Searching news sources...' },
            { progress: 50, message: 'Analyzing financial content...' },
            { progress: 75, message: 'Simplifying complex terms...' },
            { progress: 100, message: 'Finalizing results...' }
        ];
        
        let stepIndex = 0;
        
        const interval = setInterval(() => {
            if (stepIndex < steps.length) {
                const step = steps[stepIndex];
                progress = step.progress;
                
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}%`;
                if (loadingDescription) loadingDescription.textContent = step.message;
                
                stepIndex++;
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(resolve, 500);
            }
        }, 800);
    });
}

// Display News Results
function displayNewsResults(data) {
    if (!elements.newsResults || !elements.articlesContainer) return;
    
    // Show results section
    elements.newsResults.style.display = 'block';
    
    // Update results count
    document.getElementById('resultsTitle').textContent = `Results for "${currentSearchQuery}"`;
    if (elements.resultsCount) {
        elements.resultsCount.textContent = `${data.total_found} articles found`;
    }
    
    // Clear previous results
    elements.articlesContainer.innerHTML = '';
    
    if (data.articles.length === 0) {
        displayNoResults();
        return;
    }
    
    // Display articles
    data.articles.forEach((article, index) => {
        const articleElement = createArticleElement(article, index);
        elements.articlesContainer.appendChild(articleElement);
    });
    
    // Scroll to results
    setTimeout(() => {
        elements.newsResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Create Article Element
function createArticleElement(article, index) {
    const div = document.createElement('div');
    div.className = 'article-card';
    
    const complexityClass = article.analysis.complexity.toLowerCase();
    const publishedDate = new Date(article.original.publishedAt).toLocaleDateString();
    
    div.innerHTML = `
        <div class="article-header">
            <h4 class="article-title">${article.original.title}</h4>
            <div class="article-meta">
                <span class="article-source">${article.original.source}</span>
                <span class="article-date">${publishedDate}</span>
                <span class="complexity-badge ${complexityClass}">${article.analysis.complexity}</span>
            </div>
        </div>
        
        <div class="article-content">
            <div class="article-preview">
                <h5>Simplified Summary:</h5>
                <p>${article.simplified.content.substring(0, 200)}...</p>
            </div>
            
            <div class="article-stats">
                <div class="stat">
                    <span class="stat-value">${article.analysis.jargon_count}</span>
                    <span class="stat-label">Terms Simplified</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${article.analysis.readability_score}</span>
                    <span class="stat-label">Readability Score</span>
                </div>
            </div>
        </div>
        
        <div class="article-actions">
            <button class="btn-secondary" onclick="openArticleModal(${index})">View Details</button>
            <button class="btn-primary" onclick="openOriginalArticle('${article.original.url}')">Read Original</button>
        </div>
    `;
    
    // Store article data for modal
    div.setAttribute('data-article', JSON.stringify(article));
    
    return div;
}

// Display No Results
function displayNoResults() {
    if (elements.articlesContainer) {
        elements.articlesContainer.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <h3>No Articles Found</h3>
                <p>We couldn't find any recent news for "${currentSearchQuery}". Try different keywords or check back later.</p>
                <button class="btn-primary" onclick="elements.newsSearchInput.focus()">Try Another Search</button>
            </div>
        `;
    }
    
    if (elements.resultsCount) {
        elements.resultsCount.textContent = '0 articles found';
    }
}

// Simplify Custom Text
async function simplifyCustomText() {
    const text = elements.customText.value.trim();
    
    if (!text) {
        showToast('Please enter some text to simplify', 'error');
        return;
    }
    
    if (text.length > 10000) {
        showToast('Text is too long. Please keep it under 10,000 characters.', 'error');
        return;
    }
    
    showLoadingOverlay(true, 'Simplifying Text...', 'Analyzing and simplifying your financial text...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/simplify-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                level: currentSimplificationLevel
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to simplify text');
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayCustomTextResults(data);
        showToast('Text simplified successfully!', 'success');
        
    } catch (error) {
        console.error('Simplification error:', error);
        showToast('Failed to simplify text. Please try again.', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// Display Custom Text Results
function displayCustomTextResults(data) {
    if (!elements.customTextResults) return;
    
    elements.customTextResults.innerHTML = `
        <div class="results-header">
            <h3>Simplification Results</h3>
            <div class="results-meta">
                <div class="complexity-indicator">
                    <span class="complexity-label">Original Complexity:</span>
                    <span class="complexity-badge ${data.complexity.toLowerCase()}">${data.complexity}</span>
                </div>
                <div class="analysis-stats">
                    <span class="stat">
                        <span class="stat-value">${data.jargon_count}</span>
                        <span class="stat-label">Terms Simplified</span>
                    </span>
                    <span class="stat">
                        <span class="stat-value">${data.readability_score}</span>
                        <span class="stat-label">Readability Score</span>
                    </span>
                </div>
            </div>
        </div>

        <div class="text-comparison">
            <div class="original-text">
                <div class="text-header">
                    <h4 class="text-label">Original Text</h4>
                    <button class="copy-btn" onclick="copyText('${data.original_text}')" title="Copy to clipboard">📋</button>
                </div>
                <div class="text-content">${data.original_text}</div>
            </div>

            <div class="simplified-text">
                <div class="text-header">
                    <h4 class="text-label">Simplified Version</h4>
                    <button class="copy-btn" onclick="copyText('${data.simplified_text}')" title="Copy to clipboard">📋</button>
                </div>
                <div class="text-content">${data.simplified_text}</div>
            </div>
        </div>

        ${data.jargon_detected.length > 0 ? `
        <div class="simplifications-section">
            <h4>Financial Terms Explained</h4>
            <div class="jargon-explanations">
                ${data.jargon_detected.map(item => `
                    <div class="jargon-item">
                        <div class="jargon-term">${item.term}${item.count > 1 ? ` (${item.count}x)` : ''}</div>
                        <div class="jargon-explanation">${item.explanation}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${data.insights.length > 0 ? `
        <div class="insights-section">
            <h4>Key Insights</h4>
            <div class="insights-grid">
                ${data.insights.map(insight => `
                    <div class="insight-item">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    elements.customTextResults.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        elements.customTextResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Modal Functions
function openArticleModal(articleIndex) {
    const articleCards = document.querySelectorAll('.article-card');
    if (articleIndex >= articleCards.length) return;
    
    const articleData = JSON.parse(articleCards[articleIndex].getAttribute('data-article'));
    
    // Populate modal with article data
    document.getElementById('modalTitle').textContent = articleData.original.title;
    document.getElementById('modalSource').textContent = articleData.original.source;
    document.getElementById('modalDate').textContent = new Date(articleData.original.publishedAt).toLocaleDateString();
    
    // Update complexity badge
    const complexityBadge = document.querySelector('#articleModal .complexity-badge');
    complexityBadge.textContent = articleData.analysis.complexity;
    complexityBadge.className = `complexity-badge ${articleData.analysis.complexity.toLowerCase()}`;
    
    // Populate tab content
    document.getElementById('modalOriginalContent').textContent = articleData.original.content;
    document.getElementById('modalSimplifiedContent').textContent = articleData.simplified.content;
    
    // Update analysis stats
    document.getElementById('modalJargonCount').textContent = articleData.analysis.jargon_count;
    document.getElementById('modalReadabilityScore').textContent = articleData.analysis.readability_score;
    
    // Populate jargon list
    const jargonContainer = document.getElementById('modalJargonList');
    if (articleData.analysis.jargon_detected.length > 0) {
        jargonContainer.innerHTML = articleData.analysis.jargon_detected.map(item => `
            <div class="jargon-item">
                <div class="jargon-term">${item.term}${item.count > 1 ? ` (${item.count}x)` : ''}</div>
                <div class="jargon-explanation">${item.explanation}</div>
            </div>
        `).join('');
    } else {
        jargonContainer.innerHTML = '<p>No complex financial terms detected.</p>';
    }
    
    // Populate insights
    const insightsContainer = document.getElementById('modalInsights');
    if (articleData.analysis.insights.length > 0) {
        insightsContainer.innerHTML = articleData.analysis.insights.map(insight => `
            <div class="insight-item">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `).join('');
    } else {
        insightsContainer.innerHTML = '<p>No specific insights generated.</p>';
    }
    
    // Show modal
    if (elements.articleModal) {
        elements.articleModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeArticleModal() {
    if (elements.articleModal) {
        elements.articleModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function switchModalTab(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active to selected
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function openOriginalArticle(url) {
    if (url && url !== 'null') {
        window.open(url, '_blank');
    } else {
        showToast('Original article URL not available', 'info');
    }
}

// Utility Functions
function showLoadingOverlay(show, title = 'Loading...', description = 'Please wait...') {
    if (!elements.loadingOverlay) return;
    
    if (show) {
        document.getElementById('loadingTitle').textContent = title;
        document.getElementById('loadingDescription').textContent = description;
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        elements.loadingOverlay.classList.add('show');
    } else {
        elements.loadingOverlay.classList.remove('show');
    }
}

function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Text copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyText(text);
        });
    } else {
        fallbackCopyText(text);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Text copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy text', 'error');
    }
    
    document.body.removeChild(textArea);
}

function goBackHome() {
    window.location.href = '/';
}

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    if (!elements.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Add slideOutRight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
