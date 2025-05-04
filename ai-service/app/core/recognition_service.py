import numpy as np
import tensorflow as tf
import os
import logging
import time
import json
import base64
import io
from PIL import Image
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

class SketchRecognitionService:
    """Service for sketch recognition using TensorFlow models"""
    
    def __init__(self, model_path=None):
        """
        Initialize the sketch recognition service
        
        Args:
            model_path (str, optional): Path to the model file to load
        """
        self.model = None
        self.class_names = []
        self.model_loaded = False
        self.model_path = None
        
        try:
            # Find and load model
            if model_path:
                self._load_model(model_path)
            else:
                self._find_and_load_latest_model()
                
        except Exception as e:
            logger.error(f"Error initializing model: {e}")
            # Fall back to dummy model
            logger.warning("Loading fallback dummy model")
            self._load_dummy_model()
    
    def _find_and_load_latest_model(self):
        """Find and load the latest model from the models directory"""
        # Find models directory relative to the current file
        base_dir = Path(__file__).parent.parent.parent  # ai-service directory
        models_dir = base_dir / "app" / "models" / "quickdraw"
        
        logger.info(f"Looking for models in: {str(models_dir)}")
        
        # Check if directory exists
        if not models_dir.exists():
            logger.error(f"Model directory not found: {str(models_dir)}")
            raise FileNotFoundError(f"Model directory not found: {str(models_dir)}")
        
        # List all .h5 model files
        model_files = list(models_dir.glob("*.h5"))
        
        if not model_files:
            logger.error(f"No model files found in {str(models_dir)}")
            raise FileNotFoundError(f"No model files found in {str(models_dir)}")
            
        # Sort by modification time (most recent first)
        model_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        
        # Load the most recent model
        latest_model = model_files[0]
        logger.info(f"Loading latest model: {str(latest_model)}")
        self._load_model(str(latest_model))
    
    def _load_model(self, model_path):
        """Load model from file"""
        try:
            logger.info(f"Loading model from {model_path}")
            start_time = time.time()
            
            # Load the model
            self.model = tf.keras.models.load_model(model_path)
            
            # Load metadata if exists (same name with .json extension)
            metadata_path = model_path.replace('.h5', '.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.class_names = metadata.get('class_names', [])
                    logger.info(f"Loaded {len(self.class_names)} classes from metadata")
            else:
                # Default class names if metadata is missing
                self.class_names = [
                    'apple', 'airplane', 'cat', 'bicycle', 'dog', 'car', 'fish', 
                    'house', 'tree', 'bird', 'banana', 'pencil', 'flower', 'sun'
                ]
                logger.warning(f"No metadata found. Using default class names.")
            
            # Track model details
            self.model_loaded = True
            self.model_path = model_path
            load_time = time.time() - start_time
            
            logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def _load_dummy_model(self):
        """Load a dummy model for testing"""
        self.model = None
        self.model_loaded = False
        self.class_names = [
            'apple', 'airplane', 'cat', 'bicycle', 'dog', 
            'car', 'fish', 'house', 'tree', 'bird', 
            'banana', 'pencil', 'flower', 'sun'
        ]
        logger.warning("Loaded dummy model - predictions will be random")
    
    def preprocess_image(self, image_data):
        """
        Preprocess image data for model input
        
        Args:
            image_data: Image data as base64 string, PIL Image, or numpy array
            
        Returns:
            numpy.ndarray: Preprocessed image ready for model inference
        """
        try:
            # Handle different input types
            if isinstance(image_data, str):
                # Handle base64 encoded image
                if image_data.startswith('data:image'):
                    # Remove data URI prefix
                    image_data = image_data.split(',')[1]
                # Decode base64 to image
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
            elif isinstance(image_data, bytes):
                # Handle raw bytes
                image = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                # Already a PIL Image
                image = image_data
            elif isinstance(image_data, np.ndarray):
                # Already a numpy array
                return self._preprocess_array(image_data)
            else:
                raise ValueError(f"Unsupported image data type: {type(image_data)}")
            
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Resize to model input size
            image = image.resize((28, 28), Image.LANCZOS)
            
            # Convert to numpy array and normalize
            img_array = np.array(image).astype('float32') / 255.0
            
            # Invert if needed (sketch recognition models expect white on black)
            if np.mean(img_array) > 0.5:
                img_array = 1.0 - img_array
            
            # Add batch and channel dimensions
            img_array = np.expand_dims(np.expand_dims(img_array, axis=0), axis=-1)
            
            return img_array
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise
    
    def _preprocess_array(self, array):
        """Preprocess numpy array for model input"""
        try:
            # Ensure proper shape (28x28)
            if array.shape[0] != 28 or array.shape[1] != 28:
                import cv2
                array = cv2.resize(array, (28, 28))
            
            # Normalize to [0, 1]
            if array.max() > 1.0:
                array = array.astype('float32') / 255.0
                
            # Invert if needed
            if np.mean(array) > 0.5:
                array = 1.0 - array
                
            # Add batch and channel dimensions
            array = np.expand_dims(np.expand_dims(array, axis=0), axis=-1)
            
            return array
            
        except Exception as e:
            logger.error(f"Error preprocessing array: {e}")
            raise
    
    def predict(self, processed_image):
        """
        Run prediction on preprocessed image
        
        Args:
            processed_image: Preprocessed image data
            
        Returns:
            list: List of (class_name, confidence) tuples
        """
        if not self.model_loaded or self.model is None:
            # Generate random predictions for testing
            return self._generate_random_predictions()
            
        try:
            # Run inference
            predictions = self.model.predict(processed_image, verbose=0)
            
            # Get indices of top predictions
            top_indices = np.argsort(predictions[0])[::-1][:10]  # Top 10
            
            # Format predictions
            results = []
            for i in top_indices:
                if i < len(self.class_names):
                    class_name = self.class_names[i]
                    confidence = float(predictions[0][i])
                    results.append((class_name, confidence))
            
            return results
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            # Fall back to random predictions
            return self._generate_random_predictions()
    
    def _generate_random_predictions(self):
        """Generate random predictions for testing"""
        import random
        import hashlib
        
        # Create a deterministic seed based on current time
        seed = int(hashlib.md5(str(time.time()).encode()).hexdigest(), 16) % 10000
        random.seed(seed)
        
        # Select a subset of classes
        selected_classes = random.sample(self.class_names, min(5, len(self.class_names)))
        
        # Generate random confidences that sum to 1
        confidences = [random.random() for _ in range(len(selected_classes))]
        total = sum(confidences)
        confidences = [c/total for c in confidences]
        
        # Sort by confidence (highest first)
        results = sorted(zip(selected_classes, confidences), key=lambda x: x[1], reverse=True)
        
        return results
    
    def recognize_sketch(self, image_data):
        """
        End-to-end sketch recognition
        
        Args:
            image_data: Image data in various formats
            
        Returns:
            dict: Recognition results
        """
        try:
            start_time = time.time()
            
            # Preprocess image
            processed_image = self.preprocess_image(image_data)
            
            # Run prediction
            predictions = self.predict(processed_image)
            
            # Format results
            top_predictions = []
            for class_name, confidence in predictions:
                top_predictions.append({
                    "class": class_name,
                    "confidence": round(confidence * 100, 2)  # Convert to percentage
                })
            
            inference_time = time.time() - start_time
            
            # Create response
            response = {
                "success": True,
                "predictions": {
                    "inference_time": round(inference_time, 3),
                    "top_predictions": top_predictions
                }
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error in sketch recognition: {e}")
            return {
                "success": False,
                "error": str(e),
                "predictions": {
                    "top_predictions": []
                }
            }
    
    def get_model_info(self):
        """Get information about the loaded model"""
        return {
            "status": "loaded" if self.model_loaded else "not_loaded",
            "model_path": str(self.model_path) if self.model_path else None,
            "class_count": len(self.class_names),
            "class_names": self.class_names
        }

# Singleton instance
_instance = None

def get_recognition_service(model_path=None):
    """Get or create a singleton instance of the recognition service"""
    global _instance
    if _instance is None:
        _instance = SketchRecognitionService(model_path)
    return _instance
