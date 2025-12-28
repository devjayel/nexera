// Character counter for message textarea
const messageTextarea = document.getElementById('message');
const charCount = document.querySelector('.char-count');

if (messageTextarea && charCount) {
    messageTextarea.addEventListener('input', () => {
        const length = messageTextarea.value.length;
        charCount.textContent = `${length} / 1000 characters`;
        
        if (length > 1000) {
            charCount.style.color = '#dc3545';
            messageTextarea.value = messageTextarea.value.substring(0, 1000);
        } else {
            charCount.style.color = 'var(--text-muted)';
        }
    });
}

// Form submission handler
const feedbackForm = document.querySelector('.feedback-form');
const successMessage = document.getElementById('successMessage');

if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
        // Netlify will handle the actual submission
        // We just show the success message after a short delay
        setTimeout(() => {
            feedbackForm.style.display = 'none';
            successMessage.classList.add('show');
        }, 100);
    });
}

// Reset button handler
const resetButton = document.querySelector('.btn-reset');
if (resetButton) {
    resetButton.addEventListener('click', () => {
        if (charCount) {
            charCount.textContent = '0 / 1000 characters';
        }
    });
}

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';
