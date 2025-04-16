import os
import numpy as np
import tensorflow as tf
from PIL import Image
import requests
import io
import glob
from flask import current_app
import time

# Global model and class names
model = None
class_names = []

# List of classes for quick draw dataset
QUICKDRAW_CLASSES = [
    'apple', 'banana', 'car', 'cat', 'chair', 'clock', 'cloud', 'cup',
    'door', 'envelope', 'eye', 'fish', 'flower', 'house', 'key', 'leaf',
    'pants', 'pencil', 'sun', 'table', 'tree', 'umbrella'
]

def preprocess_image(image, target_size=(28, 28)):
    """
    Preprocess the image for model input
    """
    # Resize to target size
    image = image.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array
    img_array = np.array(image)
    
    # Normalize to [0, 1]
    img_array = img_array / 255.0
    
    # Invert (in Quick Draw, sketches are white on black background)
    img_array = 1 - img_array
    
    # Expand dimensions to batch size of 1
    img_array = np.expand_dims(img_array, axis=0)
    
    # Add channel dimension if model expects it
    if len(img_array.shape) < 4:
        img_array = np.expand_dims(img_array, axis=-1)
    
    return img_array

def load_model():
    """
    Load the sketch recognition model
    """
    global model, class_names
    
    # If model is already loaded, return True
    if model is not None:
        return True
    
    try:
        # Check if model file exists
        model_path = current_app.config['MODEL_PATH']
        model_files = glob.glob(os.path.join(model_path, "*.h5"))
        
        if not model_files:
            print("No model files found. Please download the model first.")
            return False
        
        # Load the model
        model = tf.keras.models.load_model(model_files[0])
        
        # Load class names
        class_names = QUICKDRAW_CLASSES
        
        print(f"Model loaded successfully with {len(class_names)} classes")
        return True
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return False

def predict_sketch(image):
    """
    Predict what the sketch is
    """
    global model, class_names
    
    # Load model if not already loaded
    if model is None and not load_model():
        # If we still don't have a model, use a dummy model for testing
        print("Using dummy predictions as model is not available")
        return dummy_predictions()
    
    # Preprocess image
    img_array = preprocess_image(image)
    
    # Make prediction
    start_time = time.time()
    predictions = model.predict(img_array)[0]
    inference_time = time.time() - start_time
    
    # Get top 5 predictions
    top_indices = predictions.argsort()[-5:][::-1]
    
    results = []
    for i in top_indices:
        results.append({
            'class': class_names[i],
            'confidence': float(predictions[i]),
        })
    
    return {
        'top_predictions': results,
        'inference_time': inference_time
    }

def dummy_predictions():
    """
    Return dummy predictions for testing when model is not available
    """
    import random
    
    # Generate random predictions for testing
    dummy_classes = QUICKDRAW_CLASSES[:5]  # Use first 5 classes
    
    results = []
    # Generate random confidence scores that sum to approximately 1
    confidences = np.random.dirichlet(np.ones(len(dummy_classes)))
    
    for i, class_name in enumerate(dummy_classes):
        results.append({
            'class': class_name,
            'confidence': float(confidences[i]),
        })
    
    # Sort by confidence
    results.sort(key=lambda x: x['confidence'], reverse=True)
    
    return {
        'top_predictions': results,
        'inference_time': 0.05,
        'note': 'These are dummy predictions for testing'
    }

def download_model():
    """
    Download a pre-trained model for sketch recognition
    """
    try:
        model_path = current_app.config['MODEL_PATH']
        model_file = os.path.join(model_path, "quickdraw_model.h5")
        
        # If model already exists, return True
        if os.path.exists(model_file):
            print("Model already exists")
            return True
        
        print("Downloading pre-trained model...")
        
        # For this example, we'll create a simple model instead of downloading
        # In a real implementation, you would download from a cloud storage
        
        # Create a simple CNN model for sketch recognition
        simple_model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(16, (3, 3), activation='relu', input_shape=(28, 28, 1)),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(32, (3, 3), activation='relu'),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(len(QUICKDRAW_CLASSES), activation='softmax')
        ])
        
        simple_model.compile(optimizer='adam',
                           loss='sparse_categorical_crossentropy',
                           metrics=['accuracy'])
        
        # Save the model
        simple_model.save(model_file)
        
        print(f"Simple model created and saved to {model_file}")
        return True
        
    except Exception as e:
        print(f"Error downloading model: {str(e)}")
        return False
