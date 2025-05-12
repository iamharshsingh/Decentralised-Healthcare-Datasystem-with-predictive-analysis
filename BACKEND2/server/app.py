from flask import Flask, request, jsonify
import pickle
import os
import numpy as np 
import pandas as pd
from flask_cors import CORS
from Chatbot import graphh
from Chatbot_agent import graphd

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/predict/heart', methods=['OPTIONS'])
def options():
    return jsonify({'status': 'ok'})


@app.route('/')
def hello_world():
    return 'Hello, welcome to the python backend!'

diabetes_model_path = os.path.join(os.path.dirname(__file__), 'diabetes.pkl')

# Load the ML model
with open(diabetes_model_path, 'rb') as f:
    diabetes_model = pickle.load(f)

print("Model Details:", diabetes_model)
print("Model's feature names:", diabetes_model.feature_names_in_)
# print("Model's coefficients:", diabetes_model.coef_)

@app.route('/predict/diabetes', methods=['POST'])
def predict_diabetes():
    try:
        # Get JSON input
        data = request.json
        print("Received data:", data)

        # Define required keys
        required_keys = [
            'pregnancies', 'glucose', 'bloodPressure', 
            'skinThickness', 'insulin', 'bmi', 
            'age', 'diabetesPedigreeFunction'
        ]

        # Validate input
        for key in required_keys:
            if key not in data:
                return jsonify({'error': f'Missing key: {key}'}), 400

        # Extract features
        features = [
            data["pregnancies"],
            data["glucose"],
            data["bloodPressure"],
            data["skinThickness"],
            data["insulin"],
            data["bmi"],
            data["age"],
            data["diabetesPedigreeFunction"]
        ]

        # Create a DataFrame with feature names
        features_df = pd.DataFrame([features], columns=diabetes_model.feature_names_in_)

        # Make prediction using the DataFrame
        prediction = diabetes_model.predict(features_df)  # The model expects a DataFrame with correct feature names

        # Prepare response
        result = {'prediction': int(prediction[0])}

        # Log prediction results
        if prediction[0] == 0:
            print("Patient is healthy for the input data:", features)
        else:
            print("Patient has diabetes for the input data:", features)

        return jsonify(result)

    except Exception as e:
        # Handle any error gracefully
        print(f"Error occurred: {e}")
        return jsonify({'error': str(e)}), 500

heart_model_path = os.path.join(os.path.dirname(__file__), 'Heart.pkl')

# Load the ML model
with open(heart_model_path, 'rb') as f:
    heart_model = pickle.load(f)
    
    
print("Model Details:", heart_model)
print("Model's feature names:", heart_model.feature_names_in_)
# print("Model's coefficients:", heart_model.coef_)

#  endpoint='predict/heart'
@app.route('/predict/heart', methods=['POST'])
def predict_heart():
    try:
        # Get JSON input
        data = request.json
        
        # Extract features from the input data
        features = [
            data['feature1'],
            data['feature2'],
            data['feature3'],
            data['feature4'],
            data['feature5'],
            data['feature6'],
            data['feature7'],
            data['feature8'],
            data['feature9'],
            data['feature10'],
            data['feature11'],
            data['feature12'],
            data['feature13']
        ]
        
        # Reshape the features to a 2D array: (1, 13)
        features = np.array(features).reshape(1, -1)
        
        # Make prediction
        prediction = heart_model.predict(features)
        
        # Return prediction as JSON
        result2 = {'prediction': int(prediction[0])}
    
        if prediction == [0]:
          print("patient is healthy:", features)
        else:
          print("patient have heart diease for the input data",features)
        return jsonify(result2)
    except Exception as e:
        # In case of any error, return the error message
        return jsonify({'error': str(e)}), 400
    
lungCancer_model_path = os.path.join(os.path.dirname(__file__), 'classification_model.pkl5')

# Load the ML model
with open(lungCancer_model_path, 'rb') as f:
    lungCancer_model = pickle.load(f)
    
    
print("Model Details:", lungCancer_model)
print("Model's feature names:", lungCancer_model.feature_names_in_)
# print("Model's coefficients:", lungCancer_model.coef_)

@app.route('/predict/lung', methods=['POST'])
def predict_lung_cancer():
    try:
        data = request.json

        # Extract features
        features = [
            data['AGE'], data['SMOKING'], data['YELLOW_FINGERS'], data['ANXIETY'],
            data['PEER_PRESSURE'], data['CHRONIC_DISEASE'], data['FATIGUE'],
            data['ALLERGY'], data['WHEEZING'], data['ALCOHOL_CONSUMING'],
            data['COUGHING'], data['SHORTNESS_OF_BREATH'], data['SWALLOWING_DIFFICULTY'],
            data['CHEST_PAIN']
        ]

        # Convert features to DataFrame with proper column names
        features_df = pd.DataFrame([features], columns=lungCancer_model.feature_names_in_)

        # Make prediction using the DataFrame
        prediction = lungCancer_model.predict(features_df)

        # Return prediction as JSON
        result = {'LUNG_CANCER': "YES" if prediction[0] == 1 else "NO"}

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 400
 
chronic_model_path = os.path.join(os.path.dirname(__file__), 'chronic_disease_kidney_model.pkl')

# Load the ML model
with open(chronic_model_path, 'rb') as f:
    chronic_model = pickle.load(f)

print("Model Details:", chronic_model)
print("Model's feature names:", chronic_model.feature_names_in_)
# print("Model's coefficients:", chronic_model.coef_) 

@app.route('/predict/chronic', methods=['POST'])
def predict_chronic_disease():
    try:
        data = request.json
        print("Received data:", data)

        # Dynamically extract features in the order the model expects
        feature_names = chronic_model.feature_names_in_
        features = [data[name] for name in feature_names]

        # Build DataFrame and make prediction
        features_df = pd.DataFrame([features], columns=feature_names)
        prediction = chronic_model.predict(features_df)

        # Map numeric prediction to Yes/No (adjust labels if needed)
        result = {
            'CHRONIC_DISEASE': "YES" if prediction[0] == 1 else "NO"
        }
        return jsonify(result)

    except KeyError as ke:
        return jsonify({'error': f"Missing feature in request: {ke}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
@app.route('/api/chat/heart', methods=['POST'])
def chat_heart():
    # Parse the incoming JSON
    data = request.get_json(force=True)
    user_input = data.get('input', '').strip()
    if not user_input:
        return jsonify({ 'error': 'Missing `input` in request body' }), 400

    # Invoke the LangGraph chat assistant
    try:
        result = graphh.invoke({ 'input': user_input })
        return jsonify({ 'response': result.get('response', '') })
    except Exception as e:
        # Log error (omitted here) and return a generic error message
        return jsonify({ 'error': 'Internal server error' }), 500

@app.route('/api/chat/diabetes', methods=['POST'])
def chat_diabetes():
    # Parse the incoming JSON
    data = request.get_json(force=True)
    user_input = data.get('input', '').strip()
    if not user_input:
        return jsonify({ 'error': 'Missing `input` in request body' }), 400

    # Invoke the LangGraph chat assistant
    try:
        result = graphd.invoke({ 'input': user_input })
        return jsonify({ 'response': result.get('response', '') })
    except Exception as e:
        # Log error (omitted here) and return a generic error message
        return jsonify({ 'error': 'Internal server error' }), 500

    
# if __name__ == '__main__':
#    port = int(os.environ.get("PORT", 10000))  # Render provides a PORT variable
#    app.run(host='0.0.0.0', port=port)



if __name__ == '__main__':
    app.run(debug=True, port=5000)

