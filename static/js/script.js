// DOM Elements
const trainBtn = document.getElementById('trainBtn');
const trainingStatus = document.getElementById('trainingStatus');
const trainingProgress = document.getElementById('trainingProgress');
const summarizeForm = document.getElementById('summarizeForm');
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const clearBtn = document.getElementById('clearBtn');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryResult = document.getElementById('summaryResult');
const summaryLoading = document.getElementById('summaryLoading');
const copyBtn = document.getElementById('copyBtn');
const toast = document.getElementById('toast');

// Character count update
inputText.addEventListener('input', function() {
    const count = this.value.length;
    charCount.textContent = count.toLocaleString();
    
    // Change color based on character count
    if (count > 5000) {
        charCount.style.color = 'var(--danger-color)';
    } else if (count > 3000) {
        charCount.style.color = 'var(--warning-color)';
    } else {
        charCount.style.color = 'var(--text-muted)';
    }
});

// Clear text functionality
clearBtn.addEventListener('click', function() {
    inputText.value = '';
    charCount.textContent = '0';
    charCount.style.color = 'var(--text-muted)';
    
    // Clear summary if present
    if (summaryResult.classList.contains('has-content')) {
        summaryResult.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-lightbulb"></i>
                <p>Your AI-generated summary will appear here</p>
            </div>
        `;
        summaryResult.classList.remove('has-content');
        copyBtn.style.display = 'none';
    }
    
    showToast('Text cleared successfully', 'info');
});

// Training functionality
trainBtn.addEventListener('click', async function() {
    const button = this;
    const originalContent = button.innerHTML;
    
    // Disable button and show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Training...';
    
    // Hide any previous status messages
    trainingStatus.style.display = 'none';
    trainingStatus.className = 'status-message';
    
    // Show progress bar
    trainingProgress.style.display = 'block';
    
    try {
        const response = await fetch('/train', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.text();
            
            // Show success message
            trainingStatus.textContent = result;
            trainingStatus.classList.add('success');
            trainingStatus.style.display = 'block';
            
            showToast('Model training completed successfully!', 'success');
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Training error:', error);
        
        // Show error message
        trainingStatus.textContent = `Training failed: ${error.message}`;
        trainingStatus.classList.add('error');
        trainingStatus.style.display = 'block';
        
        showToast('Training failed. Please try again.', 'error');
    } finally {
        // Reset button
        button.disabled = false;
        button.innerHTML = originalContent;
        
        // Hide progress bar after a delay
        setTimeout(() => {
            trainingProgress.style.display = 'none';
        }, 1000);
    }
});

// Summarization functionality
summarizeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const text = inputText.value.trim();
    
    if (!text) {
        showToast('Please enter some text to summarize', 'error');
        return;
    }
    
    if (text.length < 50) {
        showToast('Please enter at least 50 characters for better summarization', 'error');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });
        
        if (response.ok) {
            const summary = await response.json();
            showSummary(summary);
            showToast('Summary generated successfully!', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate summary');
        }
    } catch (error) {
        console.error('Summarization error:', error);
        showError(error.message);
        showToast('Failed to generate summary. Please try again.', 'error');
    }
});

// Show loading state
function showLoadingState() {
    summaryResult.style.display = 'none';
    summaryLoading.style.display = 'flex';
    copyBtn.style.display = 'none';
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
}

// Show summary result
function showSummary(summary) {
    const summaryText = typeof summary === 'string' ? summary : summary.summary || summary;
    
    summaryResult.innerHTML = `<div class="summary-text">${summaryText}</div>`;
    summaryResult.classList.add('has-content');
    summaryResult.style.display = 'block';
    summaryLoading.style.display = 'none';
    copyBtn.style.display = 'inline-flex';
    
    // Reset button
    summarizeBtn.disabled = false;
    summarizeBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Generate Summary';
}

// Show error state
function showError(errorMessage) {
    summaryResult.innerHTML = `
        <div class="placeholder">
            <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
            <p style="color: var(--danger-color);">Error: ${errorMessage}</p>
        </div>
    `;
    summaryResult.classList.remove('has-content');
    summaryResult.style.display = 'block';
    summaryLoading.style.display = 'none';
    copyBtn.style.display = 'none';
    
    // Reset button
    summarizeBtn.disabled = false;
    summarizeBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Generate Summary';
}

// Copy to clipboard functionality
copyBtn.addEventListener('click', async function() {
    const summaryText = document.querySelector('.summary-text');
    
    if (summaryText) {
        try {
            await navigator.clipboard.writeText(summaryText.textContent);
            
            // Update button temporarily
            const originalContent = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.classList.add('btn-primary');
            this.classList.remove('btn-outline');
            
            setTimeout(() => {
                this.innerHTML = originalContent;
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline');
            }, 2000);
            
            showToast('Summary copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            showToast('Failed to copy. Please select and copy manually.', 'error');
        }
    }
});

// Toast notification system
function showToast(message, type = 'info') {
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
    toastMessage.textContent = message;
    
    // Set toast type class
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigation link active state update on scroll
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Sample text functionality (for demonstration)
function loadSampleText() {
    const sampleText = `
Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century, revolutionizing industries and reshaping the way we live and work. From machine learning algorithms that power recommendation systems to natural language processing models that enable human-computer interaction, AI applications span across diverse domains including healthcare, finance, transportation, and entertainment.

Machine learning, a subset of AI, has particularly gained momentum due to advances in deep learning techniques and the availability of large datasets. Neural networks, inspired by the structure of the human brain, have achieved remarkable success in tasks such as image recognition, speech synthesis, and language translation. These models learn patterns from vast amounts of data, enabling them to make predictions and decisions with increasing accuracy.

The impact of AI extends beyond technological innovation to societal transformation. In healthcare, AI-powered diagnostic tools assist doctors in early disease detection and treatment planning. Autonomous vehicles promise to reduce traffic accidents and improve transportation efficiency. In education, personalized learning platforms adapt to individual student needs, enhancing learning outcomes.

However, the rapid advancement of AI also raises important ethical and societal questions. Issues such as algorithmic bias, privacy concerns, job displacement, and the need for transparent and explainable AI systems require careful consideration. As we continue to develop and deploy AI technologies, it is crucial to ensure that they benefit humanity while minimizing potential risks and negative consequences.

The future of AI holds immense promise, with emerging technologies like quantum computing potentially accelerating AI capabilities even further. As we stand at the threshold of an AI-driven future, collaboration between researchers, policymakers, and society at large will be essential to harness the full potential of artificial intelligence while addressing its challenges responsibly.
    `.trim();
    
    inputText.value = sampleText;
    charCount.textContent = sampleText.length.toLocaleString();
    
    if (sampleText.length > 3000) {
        charCount.style.color = 'var(--warning-color)';
    }
    
    showToast('Sample text loaded for demonstration', 'info');
}

// Add sample text button (optional feature)
function addSampleTextButton() {
    const formActions = document.querySelector('.form-actions');
    const sampleBtn = document.createElement('button');
    sampleBtn.type = 'button';
    sampleBtn.className = 'btn btn-outline';
    sampleBtn.innerHTML = '<i class="fas fa-file-text"></i> Load Sample';
    sampleBtn.addEventListener('click', loadSampleText);
    
    formActions.insertBefore(sampleBtn, clearBtn);
}

// Initialize sample text button
document.addEventListener('DOMContentLoaded', function() {
    addSampleTextButton();
    
    // Show welcome message
    setTimeout(() => {
        showToast('Welcome to NLP Text Summarizer! Try the sample text to get started.', 'info');
    }, 1000);
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (inputText.value.trim() && !summarizeBtn.disabled) {
            summarizeForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear
    if (e.key === 'Escape') {
        if (inputText.value) {
            clearBtn.click();
        }
    }
});

// Auto-resize textarea
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
}

inputText.addEventListener('input', function() {
    autoResize(this);
});

// Initialize auto-resize
document.addEventListener('DOMContentLoaded', function() {
    autoResize(inputText);
});