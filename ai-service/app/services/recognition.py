import numpy as np
import tensorflow as tf
import cv2
from PIL import Image
import io
import base64
import json
import logging
from pathlib import Path
import re
import os
from tensorflow.lite.python.interpreter import Interpreter

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('recognition_service')

class SketchRecognitionService:
    """
    Service for sketch recognition using trained models
    """
    def __init__(self, model_path=None):
        """
        Initialize the recognition service with a trained model
        
        Args:
            model_path (str, optional): Path to trained model. If not provided, will try to find latest model.
        """
        self.model = None
        self.interpreter = None
        self.model_type = None  # 'h5' or 'tflite'
        self.class_names = []
        self.input_shape = None
        
        # Load model
        if model_path:
            self.load_model(model_path)
        else:
            # Find latest model in default location
            self._find_and_load_latest_model()
    
    def _find_and_load_latest_model(self):
        """Find and load the latest model from the default models directory"""
        base_path = Path(__file__).parent.parent / "models" / "quickdraw"
        
        # Try to find TFLite model first (preferred for inference)
        tflite_models = list(base_path.glob("*.tflite"))
        h5_models = list(base_path.glob("*.h5"))
        
        if tflite_models:
            # Sort by modification time, most recent first
            latest_model = sorted(tflite_models, key=os.path.getmtime, reverse=True)[0]
            logger.info(f"Loading latest TFLite model: {latest_model}")
            self.load_model(str(latest_model))
        elif h5_models:
            # Sort by modification time, most recent first
            latest_model = sorted(h5_models, key=os.path.getmtime, reverse=True)[0]
            logger.info(f"Loading latest H5 model: {latest_model}")
            self.load_model(str(latest_model))
        else:
            logger.error("No models found in default directory")
            raise FileNotFoundError("No models found in default directory")
    
    def load_model(self, model_path):
        """
        Load a trained model for inference
        
        Args:
            model_path (str): Path to model file (.h5 or .tflite)
        """
        model_path = str(model_path)
        logger.info(f"Loading model from {model_path}")
        
        # Load metadata
        metadata_path = model_path.replace('.h5', '.json')
        metadata_path = metadata_path.replace('.tflite', '.json')
        
        try:
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.class_names = metadata.get('class_names', [])
                    self.input_shape = tuple(metadata.get('input_shape', [28, 28, 1]))
                    logger.info(f"Loaded classes: {self.class_names}")
            else:
                logger.warning("Model metadata not found. Using default settings.")
                self.class_names = ['airplane', 'apple', 'bicycle', 'cat', 'house']
                self.input_shape = (28, 28, 1)
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            self.class_names = ['airplane', 'apple', 'bicycle', 'cat', 'house']
            self.input_shape = (28, 28, 1)
        
        # Load model based on file extension
        if model_path.endswith('.tflite'):
            self.model_type = 'tflite'
            try:
                self.interpreter = Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                logger.info("TFLite model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading TFLite model: {e}")
                raise
        else:
            self.model_type = 'h5'
            try:
                self.model = tf.keras.models.load_model(model_path)
                logger.info("H5 model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading H5 model: {e}")
                raise
    
    def preprocess_canvas_data(self, canvas_data):
        """
        Preprocess canvas data for model input
        
        Args:
            canvas_data (dict or str): Canvas data in various formats:
                - Base64 encoded image string
                - JSON with image data
                - Raw bytes of image
                
        Returns:
            numpy.ndarray: Preprocessed image ready for model inference
        """
        try:
            # Handle different input types
            image = None
            
            # Case 1: Base64 encoded image string
            if isinstance(canvas_data, str) and canvas_data.startswith('data:image'):
                # Extract the base64 part
                base64_data = re.sub(r'^data:image/\w+;base64,', '', canvas_data)
                image_bytes = base64.b64decode(base64_data)
                image = Image.open(io.BytesIO(image_bytes))
            
            # Case 2: Raw bytes
            elif isinstance(canvas_data, bytes):
                image = Image.open(io.BytesIO(canvas_data))
            
            # Case 3: Already a PIL Image
            elif isinstance(canvas_data, Image.Image):
                image = canvas_data
            
            # Case 4: Already a numpy array
            elif isinstance(canvas_data, np.ndarray):
                # Convert to grayscale if it's RGB/RGBA
                if len(canvas_data.shape) > 2 and canvas_data.shape[2] > 1:
                    image = cv2.cvtColor(canvas_data, cv2.COLOR_RGB2GRAY)
                else:
                    image = canvas_data
            
            # Convert PIL Image to numpy array
            if isinstance(image, Image.Image):
                image = np.array(image)
                
                # Convert to grayscale if it's RGB/RGBA
                if len(image.shape) > 2 and image.shape[2] > 1:
                    image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Ensure image is the right size (28x28)
            if image.shape[0] != 28 or image.shape[1] != 28:
                image = cv2.resize(image, (28, 28), interpolation=cv2.INTER_AREA)
            
            # Normalize pixel values to [0, 1]
            if image.max() > 1.0:
                image = image.astype(np.float32) / 255.0
            
            # Invert colors if needed (assume sketch is black on white)
            # If mean pixel value is high, we need to invert
            if np.mean(image) > 0.5:
                image = 1.0 - image
                
            # Add channel dimension if needed
            if len(image.shape) == 2:
                image = np.expand_dims(image, axis=-1)
                
            # Add batch dimension
            image = np.expand_dims(image, axis=0)
            
            return image
            
        except Exception as e:
            logger.error(f"Error preprocessing canvas data: {e}")
            raise
    
    def predict(self, image_data):
        """
        Run inference on preprocessed image data
        
        Args:
            image_data (numpy.ndarray): Preprocessed image data
            
        Returns:
            list: List of (class_name, confidence) tuples, sorted by confidence
        """
        try:
            if self.model_type == 'tflite':
                return self._predict_tflite(image_data)
            else:
                return self._predict_h5(image_data)
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise
    
    def _predict_h5(self, image_data):
        """Prediction using Keras H5 model"""
        if self.model is None:
            raise ValueError("Model not loaded")
        
        # Run prediction
        predictions = self.model.predict(image_data)
        
        # Format results
        results = []
        for i, conf in enumerate(predictions[0]):
            if i < len(self.class_names):
                class_name = self.class_names[i]
                results.append((class_name, float(conf)))
        
        # Sort by confidence (highest first)
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    
    def _predict_tflite(self, image_data):
        """Prediction using TFLite model"""
        if self.interpreter is None:
            raise ValueError("TFLite interpreter not loaded")
        
        # Get input details
        input_details = self.interpreter.get_input_details()
        output_details = self.interpreter.get_output_details()
        
        # Ensure input data type matches model expectations
        if input_details[0]['dtype'] == np.float32:
            image_data = image_data.astype(np.float32)
        
        # Set input tensor
        self.interpreter.set_tensor(input_details[0]['index'], image_data)
        
        # Run inference
        self.interpreter.invoke()
        
        # Get output tensor
        predictions = self.interpreter.get_tensor(output_details[0]['index'])
        
        # Format results
        results = []
        for i, conf in enumerate(predictions[0]):
            if i < len(self.class_names):
                class_name = self.class_names[i]
                results.append((class_name, float(conf)))
        
        # Sort by confidence (highest first)
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    
    def recognize_sketch(self, canvas_data):
        """
        End-to-end recognition pipeline:
        1. Preprocess canvas data
        2. Run inference
        3. Return formatted results with confidence scores
        
        Args:
            canvas_data: Canvas data in various formats
            
        Returns:
            dict: Recognition results with top predictions and confidence scores
        """
        try:
            # Step 1: Preprocess canvas data
            processed_image = self.preprocess_canvas_data(canvas_data)
            
            # Step 2: Run inference
            predictions = self.predict(processed_image)
            
            # Step 3: Format results
            formatted_results = []
            for class_name, confidence in predictions:
                formatted_results.append({
                    "class": class_name,
                    "confidence": round(confidence * 100, 2)  # Convert to percentage
                })
            
            # Create final response
            response = {
                "success": True,
                "predictions": formatted_results,
                "top_prediction": formatted_results[0] if formatted_results else None
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error recognizing sketch: {e}")
            return {
                "success": False,
                "error": str(e),
                "predictions": []
            }
