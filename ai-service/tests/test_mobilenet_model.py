"""
Test script for the MobileNet model - evaluates the model on a single image
"""
import os
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import logging
import time
from PIL import Image

# Add project root directory to Python path to allow imports from app package
root_dir = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(root_dir))

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    # Now we can import from app package
    from app.utils.image_utils import enhanced_preprocess_image
    from app.utils.model_utils import load_model_with_metadata
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.info("Creating minimal utility functions locally...")
    
    # Create fallback utility functions if imports fail
    def enhanced_preprocess_image(image):
        """Fallback preprocessing function"""
        if isinstance(image, np.ndarray):
            # Convert numpy array to PIL Image
            if image.dtype == np.uint8:
                image = Image.fromarray(image)
            else:
                image = Image.fromarray((image * 255).astype(np.uint8))
        
        # Ensure we have a PIL Image
        if not isinstance(image, Image.Image):
            raise ValueError(f"Expected PIL Image or numpy array, got {type(image)}")
            
        # Convert to grayscale if not already
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize to target size (28x28)
        image = image.resize((28, 28), Image.LANCZOS)
        
        # Convert to numpy array and normalize to [0, 1]
        img_array = np.array(image).astype(np.float32) / 255.0
        
        # Invert if needed (most drawings are dark on light background)
        if np.mean(img_array) > 0.5:
            img_array = 1.0 - img_array
            
        # Add batch and channel dimensions
        processed = np.expand_dims(np.expand_dims(img_array, axis=0), axis=-1)
        
        return processed
    
    def load_model_with_metadata(model_path):
        """Fallback model loading function"""
        import tensorflow as tf
        try:
            model = tf.keras.models.load_model(model_path)
            # Default metadata with common classes
            metadata = {
                'class_names': [
                    'apple', 'bicycle', 'car', 'cat', 'chair', 'clock', 'dog',
                    'face', 'fish', 'house', 'star', 'tree', 'umbrella', 'airplane'
                ]
            }
            return model, metadata
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return None, None

# Default class names for Quick Draw dataset
DEFAULT_CLASSES = [
    'apple', 'bicycle', 'car', 'cat', 'chair', 'clock', 'dog',
    'face', 'fish', 'house', 'star', 'tree', 'umbrella', 'airplane'
]

def test_model_on_image(model_path, image_path, visualize=False, top_k=5):
    """
    Test the trained model on a single image
    
    Args:
        model_path: Path to the trained model
        image_path: Path to the image to test
        visualize: Whether to display the image and predictions
        top_k: Number of top predictions to show
    
    Returns:
        tuple: (top_class, top_score, all_predictions)
    """
    logger.info(f"Testing model {Path(model_path).name} on image {Path(image_path).name}")
    
    # Load the model
    model, metadata = load_model_with_metadata(model_path)
    
    if model is None:
        logger.error("Failed to load model")
        return None, 0, []
        
    # Get class names from metadata or use defaults
    class_names = metadata.get('class_names', DEFAULT_CLASSES) if metadata else DEFAULT_CLASSES
    logger.info(f"Model has {len(class_names)} classes: {class_names}")
    
    # Load and preprocess the image
    try:
        img = Image.open(image_path)
        logger.info(f"Loaded image with size {img.size} and mode {img.mode}")
        
        # Preprocess the image for the model
        start_time = time.time()
        
        # Use enhanced preprocessing
        input_img = enhanced_preprocess_image(img)
        logger.info(f"Preprocessed image to shape {input_img.shape}")
        
        # Make prediction
        prediction = model.predict(input_img, verbose=0)
        inference_time = time.time() - start_time
        
        # Get top-k predictions
        top_indices = prediction[0].argsort()[-top_k:][::-1]
        top_predictions = []
        
        for i, idx in enumerate(top_indices):
            if idx < len(class_names):
                class_name = class_names[idx]
                confidence = float(prediction[0][idx])
                top_predictions.append((class_name, confidence))
                logger.info(f"Top {i+1}: {class_name} ({confidence:.4f})")
        
        # Visualize if requested
        if visualize and top_predictions:
            plt.figure(figsize=(10, 5))
            
            # Display the image
            plt.subplot(1, 2, 1)
            if img.mode == 'L':
                plt.imshow(img, cmap='gray')
            else:
                plt.imshow(img)
            plt.title(f"Input Image")
            plt.axis('off')
            
            # Display predictions
            plt.subplot(1, 2, 2)
            classes = [p[0] for p in top_predictions]
            scores = [p[1] for p in top_predictions]
            
            y_pos = np.arange(len(classes))
            plt.barh(y_pos, scores, align='center')
            plt.yticks(y_pos, classes)
            plt.xlabel('Confidence')
            plt.title('Predictions')
            
            plt.tight_layout()
            plt.show()
        
        logger.info(f"Inference completed in {inference_time:.4f} seconds")
        return top_predictions[0][0], top_predictions[0][1], top_predictions
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, 0, []

def main():
    parser = argparse.ArgumentParser(description='Test MobileNet model on a single image')
    parser.add_argument('--model', type=str, required=False,
                       help='Path to the trained model file')
    parser.add_argument('--image', type=str, required=True,
                       help='Path to the image file to test')
    parser.add_argument('--visualize', action='store_true',
                       help='Visualize the results')
    parser.add_argument('--top-k', type=int, default=5,
                       help='Number of top predictions to show')
    
    args = parser.parse_args()
    
    # If model is not specified, find the latest model in the models directory
    model_path = args.model
    if not model_path:
        try:
            from app.utils.model_utils import get_latest_model
            
            # Check both old and new model directories
            base_dir = Path(__file__).parent.parent
            old_models_dir = base_dir / "app" / "models" / "quickdraw"
            new_models_dir = base_dir / "models" / "quickdraw"
            
            if new_models_dir.exists():
                model_path = get_latest_model(new_models_dir)
            elif old_models_dir.exists():
                model_path = get_latest_model(old_models_dir)
                
            if not model_path:
                logger.error("No model found. Please specify a model path with --model")
                return
        except ImportError:
            logger.error("Could not import get_latest_model utility. Please specify a model path with --model")
            return
    
    # Test the model on the image
    test_model_on_image(model_path, args.image, args.visualize, args.top_k)

if __name__ == "__main__":
    main()
