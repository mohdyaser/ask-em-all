"""
Ask Em All - Multi-LLM Comparison App (Flask Version)

A clean, modern web app to query multiple LLMs using OpenRouter API.
"""

from flask import Flask, render_template, request, jsonify
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)

OPENROUTER_BASE = "https://openrouter.ai/api/v1"


def fetch_models(api_key: str) -> list[dict]:
    """Fetch available models from OpenRouter API."""
    if not api_key:
        return []
    
    try:
        response = requests.get(
            f"{OPENROUTER_BASE}/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        models = sorted(data.get("data", []), key=lambda x: x["id"])
        return [{"id": m["id"], "name": m.get("name", m["id"])} for m in models]
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []


def chat_with_model(api_key: str, model: str, messages: list[dict]) -> tuple[str, str]:
    """Send a chat request to a model. Returns (model_id, response)."""
    try:
        response = requests.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ask-em-all.local",
                "X-Title": "Ask Em All"
            },
            json={"model": model, "messages": messages},
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        return model, data["choices"][0]["message"]["content"]
    except Exception as e:
        return model, f"Error: {str(e)}"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/models', methods=['POST'])
def get_models():
    data = request.json
    api_key = data.get('api_key', '')
    models = fetch_models(api_key)
    return jsonify({"models": models})


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    api_key = data.get('api_key', '')
    models = data.get('models', [])
    messages = data.get('messages', [])
    
    if not api_key or not models or not messages:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Query all models in parallel
    results = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(chat_with_model, api_key, model, messages): model
            for model in models
        }
        for future in as_completed(futures):
            model_id, response = future.result()
            results[model_id] = response
    
    return jsonify({"responses": results})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=7860)
