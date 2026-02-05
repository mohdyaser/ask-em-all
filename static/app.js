// State
let apiKey = localStorage.getItem('openrouter_api_key') || '';
let models = [];
let selectedModels = [];
let chatHistories = {};
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

        document.getElementById('modelStatus').textContent = `✓ ${models.length} models loaded`;
        renderModelList();

        setTimeout(closeSettings, 800);
    } catch (error) {
        document.getElementById('modelStatus').textContent = `Error: ${error.message}`;
    }
}

// Render Model List in Right Panel
function renderModelList(filter = '') {
    const listEl = document.getElementById('modelList');
    const filterLower = filter.toLowerCase();

    const filteredModels = models.filter(m =>
        m.id.toLowerCase().includes(filterLower) ||
        m.name.toLowerCase().includes(filterLower)
    );

    if (filteredModels.length === 0 && models.length === 0) {
        listEl.innerHTML = '<p class="model-hint">Enter API key to load models</p>';
        return;
    }

    if (filteredModels.length === 0) {
        listEl.innerHTML = '<p class="model-hint">No models match your search</p>';
        return;
    }

    listEl.innerHTML = filteredModels.map(m => {
        const isSelected = selectedModels.includes(m.id);
        const shortName = m.name.length > 30 ? m.name.substring(0, 30) + '...' : m.name;
        return `
            <div class="model-item ${isSelected ? 'selected' : ''}" onclick="toggleModel('${m.id}')">
                <div class="checkbox"></div>
                <div class="model-name" title="${m.id}">${shortName}</div>
            </div>
        `;
    }).join('');
}

// Filter Models
function filterModels() {
    const search = document.getElementById('modelSearch').value;
    renderModelList(search);
}

// Toggle Model Selection
function toggleModel(modelId) {
    if (selectedModels.includes(modelId)) {
        selectedModels = selectedModels.filter(m => m !== modelId);
    } else {
        selectedModels.push(modelId);
        if (!chatHistories[modelId]) {
            chatHistories[modelId] = [];
        }
    }

    renderModelList(document.getElementById('modelSearch').value);
    renderSelectedModels();
    updateTabs();
}

// Remove Model
function removeModel(modelId) {
    selectedModels = selectedModels.filter(m => m !== modelId);
    renderModelList(document.getElementById('modelSearch').value);
    renderSelectedModels();
    updateTabs();
}

// Render Selected Models
function renderSelectedModels() {
    document.getElementById('selectedCount').textContent = selectedModels.length;

    const listEl = document.getElementById('selectedModelsList');
    listEl.innerHTML = selectedModels.map(modelId => {
        const model = models.find(m => m.id === modelId);
        const name = model ? model.name.split('/').pop() : modelId.split('/').pop();
        const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
        return `
            <div class="selected-tag">
                ${shortName}
                <span class="remove" onclick="removeModel('${modelId}')">×</span>
            </div>
        `;
    }).join('');
}

// Tab Management
function updateTabs() {
    const tabsContainer = document.getElementById('tabs');

    let tabsHtml = `<button class="tab ${currentTab === 'all' ? 'active' : ''}" data-model="all" onclick="switchTab('all')">Ask Em All</button>`;

    selectedModels.forEach(modelId => {
        const model = models.find(m => m.id === modelId);
        const name = model ? model.name.split('/').pop() : modelId.split('/').pop();
        const shortName = name.length > 20 ? name.substring(0, 20) + '...' : name;
        const isActive = currentTab === modelId;
        tabsHtml += `<button class="tab ${isActive ? 'active' : ''}" data-model="${modelId}" onclick="switchTab('${modelId}')">${shortName}</button>`;
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

    if (selectedModels.length === 0) {
        alert('Please select at least one model from the right panel');
        return;
    }

    // Hide welcome, show messages
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('messages').style.display = 'block';

    input.value = '';

    // Determine which models to message
    const modelsToMessage = currentTab === 'all' ? selectedModels : [currentTab];

    // Add user message to histories
    modelsToMessage.forEach(m => {
        if (!chatHistories[m]) chatHistories[m] = [];
        chatHistories[m].push({ role: 'user', content: message });
    });
    renderMessages();

    // Show loading
    const messagesDiv = document.getElementById('messages');
    const loadingId = Date.now();
    messagesDiv.insertAdjacentHTML('beforeend', `<div class="message assistant" id="loading-${loadingId}"><div class="loading"></div></div>`);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
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

        document.getElementById(`loading-${loadingId}`)?.remove();

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
        // Show each model's latest exchange
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
    renderSelectedModels();
    renderModelList(document.getElementById('modelSearch')?.value || '');
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
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}
