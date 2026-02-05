// State
let apiKey = localStorage.getItem('openrouter_api_key') || '';
let models = [];
let selectedModels = [];
let chatHistories = {}; // Per-model chat histories
let currentTab = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
        loadModels();
    } else {
        openSettings();
    }
});

// Settings Modal
function openSettings() {
    document.getElementById('settingsModal').classList.add('open');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('open');
}

// Load Models
async function loadModels() {
    const key = document.getElementById('apiKey').value.trim();
    if (!key) {
        document.getElementById('modelStatus').textContent = 'Please enter an API key';
        return;
    }

    apiKey = key;
    localStorage.setItem('openrouter_api_key', apiKey);
    document.getElementById('modelStatus').textContent = 'Loading models...';

    try {
        const response = await fetch('/api/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });

        const data = await response.json();
        models = data.models || [];

        // Update model select
        const select = document.getElementById('modelSelect');
        select.innerHTML = models.map(m =>
            `<option value="${m.id}">${m.name}</option>`
        ).join('');

        document.getElementById('modelStatus').textContent = `✓ ${models.length} models loaded`;

        // Auto-close settings after success
        setTimeout(closeSettings, 1000);
    } catch (error) {
        document.getElementById('modelStatus').textContent = `Error: ${error.message}`;
    }
}

// Tab Management
function updateTabs() {
    const tabsContainer = document.getElementById('tabs');

    // Keep "Ask Em All" tab, add selected model tabs
    let tabsHtml = `<button class="tab ${currentTab === 'all' ? 'active' : ''}" data-model="all" onclick="switchTab('all')">Ask Em All</button>`;

    selectedModels.forEach(modelId => {
        const model = models.find(m => m.id === modelId);
        const name = model ? model.name.split('/').pop() : modelId.split('/').pop();
        const isActive = currentTab === modelId;
        tabsHtml += `<button class="tab ${isActive ? 'active' : ''}" data-model="${modelId}" onclick="switchTab('${modelId}')">${name}</button>`;
    });

    tabsContainer.innerHTML = tabsHtml;
}

function switchTab(tabId) {
    currentTab = tabId;
    updateTabs();
    renderMessages();
}

// Send Message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    const select = document.getElementById('modelSelect');
    const newSelectedModels = Array.from(select.selectedOptions).map(opt => opt.value);

    if (newSelectedModels.length === 0) {
        alert('Please select at least one model');
        return;
    }

    // Update selected models and tabs
    newSelectedModels.forEach(m => {
        if (!selectedModels.includes(m)) {
            selectedModels.push(m);
            chatHistories[m] = [];
        }
    });
    updateTabs();

    // Hide welcome, show messages
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('messages').style.display = 'block';

    // Clear input
    input.value = '';

    // Determine which models to message
    const modelsToMessage = currentTab === 'all' ? newSelectedModels : [currentTab];

    // Add user message to histories
    modelsToMessage.forEach(m => {
        if (!chatHistories[m]) chatHistories[m] = [];
        chatHistories[m].push({ role: 'user', content: message });
    });
    renderMessages();

    // Show loading
    const messagesDiv = document.getElementById('messages');
    const loadingId = Date.now();
    const loadingHtml = `<div class="message assistant" id="loading-${loadingId}"><div class="loading"></div></div>`;
    messagesDiv.insertAdjacentHTML('beforeend', loadingHtml);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        // Build messages for API
        const apiMessages = modelsToMessage.length === 1
            ? chatHistories[modelsToMessage[0]]
            : [{ role: 'user', content: message }];

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                models: modelsToMessage,
                messages: apiMessages
            })
        });

        const data = await response.json();

        // Remove loading
        document.getElementById(`loading-${loadingId}`)?.remove();

        // Add responses to histories
        for (const [modelId, responseText] of Object.entries(data.responses || {})) {
            if (!chatHistories[modelId]) chatHistories[modelId] = [];
            chatHistories[modelId].push({ role: 'assistant', content: responseText });
        }

        renderMessages();
    } catch (error) {
        document.getElementById(`loading-${loadingId}`)?.remove();
        alert(`Error: ${error.message}`);
    }
}

// Render Messages
function renderMessages() {
    const messagesDiv = document.getElementById('messages');
    let html = '';

    if (currentTab === 'all') {
        // Show interlaced messages from all models
        // Group by user message and show all responses
        const allMessages = [];
        selectedModels.forEach(modelId => {
            (chatHistories[modelId] || []).forEach((msg, idx) => {
                allMessages.push({ ...msg, modelId, idx });
            });
        });

        // Simple approach: show each model's history
        selectedModels.forEach(modelId => {
            const history = chatHistories[modelId] || [];
            const modelName = modelId.split('/').pop();

            history.forEach(msg => {
                if (msg.role === 'user') {
                    html += `<div class="message user"><div class="bubble">${escapeHtml(msg.content)}</div></div>`;
                } else {
                    html += `<div class="message assistant">
                        <div class="model-name">${modelName}</div>
                        <div class="bubble">${formatResponse(msg.content)}</div>
                    </div>`;
                }
            });
        });
    } else {
        // Show single model history
        const history = chatHistories[currentTab] || [];
        const modelName = currentTab.split('/').pop();

        history.forEach(msg => {
            if (msg.role === 'user') {
                html += `<div class="message user"><div class="bubble">${escapeHtml(msg.content)}</div></div>`;
            } else {
                html += `<div class="message assistant">
                    <div class="model-name">${modelName}</div>
                    <div class="bubble">${formatResponse(msg.content)}</div>
                </div>`;
            }
        });
    }

    messagesDiv.innerHTML = html;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// New Chat
function newChat() {
    chatHistories = {};
    selectedModels = [];
    currentTab = 'all';
    updateTabs();
    document.getElementById('welcome').style.display = 'flex';
    document.getElementById('messages').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
}

// Use Suggestion
function useSuggestion(text) {
    document.getElementById('messageInput').value = text;
    document.getElementById('messageInput').focus();
}

// Handle Enter key
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Utilities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatResponse(text) {
    // Basic markdown-like formatting
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
