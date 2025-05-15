from flask import Flask, request, jsonify
from flask_cors import CORS

# Assuming `graph` is imported from your LangGraph setup
from Chatbot_Lung import graph

app = Flask(__name__)
# Enable CORS so your frontend on a different origin can access this endpoint
CORS(app)


@app.route('/api/chat/lung', methods=['POST'])
def chat_lung():
    data = request.get_json(force=True)
    user_input = data.get('input', '').strip()
    if not user_input:
        return jsonify({ 'error': 'Missing `input` in request body' }), 400

    try:
        result = graph.invoke({ 'input': user_input })
        return jsonify({ 'response': result.get('response', '') })
    except Exception as e:
        # Optionally log e here
        return jsonify({ 'error': 'Internal server error' }), 500
    
if __name__ == '__main__':
    # Run on port 5000 by default; adjust as needed
    app.run(host='0.0.0.0', port=5000, debug=True)