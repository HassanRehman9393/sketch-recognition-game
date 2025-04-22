import argparse
import sys
import json
import time
import base64
import io
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt

# Configure argument parser
parser = argparse.ArgumentParser(description='Test the sketch recognition inference pipeline')
parser.add_argument('--image', type=str, help='Path to sketch image file')
parser.add_argument('--model', type=str, help='Path to model file')
args = parser.parse_args()

# Try to import recognition service
try:
    from app.services.recognition import SketchRecognitionService
    from app.utils.image_utils import base64_to_image, image_to_base64
    from PIL import Image
except ImportError as e:
    print(f"Error: {str(e)}")
    print("\nMissing dependencies. Please install required packages:")
    print("pip install -r requirements.txt")
    sys.exit(1)

def main():
    # Load model
    model_path = args.model
    if model_path is None:
        # Try to find the latest model
        base_dir = Path(__file__).parent
        model_dir = base_dir / "app" / "models" / "quickdraw"
        
        # Find .h5 files
        model_files = list(model_dir.glob("*.h5"))
        if not model_files:
            print(f"No model files found in {model_dir}")
            sys.exit(1)
        
        # Sort by modification time (newest first)
        model_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        model_path = str(model_files[0])
        print(f"Using latest model: {model_path}")
    
    # Initialize recognition service
    print(f"Loading model from {model_path}")
    recognition_service = SketchRecognitionService(model_path=model_path)
    
    # Check if model loaded successfully
    model_info = recognition_service.get_model_info()
    if model_info['status'] != 'loaded':
        print(f"Failed to load model: {model_info}")
        sys.exit(1)
    
    print(f"Model loaded successfully")
    print(f"Class names: {recognition_service.class_names}")
    
    # If no class names were loaded from metadata, use default classes
    if not recognition_service.class_names:
        print("Warning: No class names found in model metadata. Using default Quick Draw categories.")
        default_classes = [
            'airplane', 'apple', 'bicycle', 'car', 'cat', 'chair', 'clock', 'dog', 
            'face', 'fish', 'house', 'star', 'tree', 'umbrella'
        ]
        # Update the service with default class names
        recognition_service.class_names = default_classes
        print(f"Using default class names: {default_classes}")
    
    # Test with a sketch image if provided
    if args.image:
        image_path = args.image
        
        try:
            # Load image
            with Image.open(image_path) as img:
                # Convert to grayscale if needed
                if img.mode != 'L':
                    img = img.convert('L')
                
                # Get base64 representation
                image_data = image_to_base64(img)
                
                # Create canvas data with image
                canvas_data = {
                    'image_data': image_data
                }
                
                # Run prediction
                print(f"Running inference on image: {image_path}")
                result = recognition_service.predict(canvas_data)
                
                # Print predictions
                if result['success']:
                    print("\nPrediction Results:")
                    for i, pred in enumerate(result['predictions']['top_predictions']):
                        print(f"{i+1}. {pred['class']}: {pred['confidence']*100:.2f}%")
                    print(f"\nInference time: {result['predictions']['inference_time']:.4f} seconds")
                else:
                    print(f"Error: {result['error']}")
                
                # Display the image and predictions
                plt.figure(figsize=(6, 6))
                plt.imshow(img, cmap='gray')
                plt.title(f"Top prediction: {result['predictions']['top_predictions'][0]['class']}")
                plt.axis('off')
                plt.show()
        
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            sys.exit(1)
    else:
        # Create a test stroke pattern
        print("No image provided, creating a test stroke pattern...")
        
        # Create a square shape with strokes
        strokes = [
            [
                {"x": 10, "y": 10},
                {"x": 10, "y": 90},
                {"x": 90, "y": 90},
                {"x": 90, "y": 10},
                {"x": 10, "y": 10}
            ]
        ]
        
        # Create canvas data with strokes
        canvas_data = {
            'strokes': strokes
        }
        
        # Run prediction
        print("Running inference on test stroke pattern")
        result = recognition_service.predict(canvas_data)
        
        # Print predictions
        if result['success'] and 'predictions' in result and 'top_predictions' in result['predictions']:
            top_predictions = result['predictions']['top_predictions']
            if top_predictions:
                print("\nPrediction Results:")
                for i, pred in enumerate(top_predictions):
                    print(f"{i+1}. {pred['class']}: {pred['confidence']*100:.2f}%")
                print(f"\nInference time: {result['predictions']['inference_time']:.4f} seconds")
                
                # Visualize the stroke pattern
                from app.utils.image_utils import strokes_to_image
                img = strokes_to_image(strokes, width=256, height=256)
                
                plt.figure(figsize=(6, 6))
                plt.imshow(img)
                plt.title(f"Test stroke pattern\nTop prediction: {top_predictions[0]['class']}")
                plt.axis('off')
                plt.show()
            else:
                print("\nNo predictions returned by model. The model may need retraining or the input may be unrecognizable.")
                
                # Still display the image even without predictions
                from app.utils.image_utils import strokes_to_image
                img = strokes_to_image(strokes, width=256, height=256)
                
                plt.figure(figsize=(6, 6))
                plt.imshow(img)
                plt.title("Test stroke pattern\n(No predictions available)")
                plt.axis('off')
                plt.show()
        else:
            print(f"Error: {result.get('error', 'Unknown error during inference')}")
            
            # Display the image even when prediction fails
            from app.utils.image_utils import strokes_to_image
            img = strokes_to_image(strokes, width=256, height=256)
            
            plt.figure(figsize=(6, 6))
            plt.imshow(img)
            plt.title("Test stroke pattern\n(Inference failed)")
            plt.axis('off')
            plt.show()

if __name__ == "__main__":
    main()
