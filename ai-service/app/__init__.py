from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import random
import time

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    @app.route('/')
    def index():
        return jsonify({'message': 'Sketch Recognition AI Service is running'})
    
    @app.route('/recognize', methods=['POST'])
    def recognize():
        try:
            # For now, just return dummy predictions
            # Later we'll add actual model inference
            categories = [
                'apple', 'banana', 'car', 'cat', 'chair', 'clock', 'cloud', 'cup',
                'door', 'envelope', 'eye', 'fish', 'flower', 'house', 'key', 'leaf',
                'pants', 'pencil', 'sun', 'table', 'tree', 'umbrella'
            ]
            
            # Generate 5 random predictions
            selected_categories = random.sample(categories, 5)
            
            # Generate confidence scores that sum to 1
            confidences = [random.random() for _ in range(5)]
            total = sum(confidences)
            confidences = [c/total for c in confidences]
            
            # Sort by confidence (highest first)
            predictions = sorted(
                [{"class": cat, "confidence": conf} for cat, conf in zip(selected_categories, confidences)],
                key=lambda x: x["confidence"],
                reverse=True
            )
            
            return jsonify({
                'success': True,
                'predictions': {
                    'top_predictions': predictions,
                    'inference_time': 0.05,
                    'note': 'These are dummy predictions - real model will be integrated later'
                },
                'timestamp': time.time()
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/status', methods=['GET'])
    def status():
        return jsonify({
            'status': 'ready',
            'message': 'AI service is running with dummy model',
            'version': '0.1.0'
        })
    
    return app
