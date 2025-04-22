import argparse
import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('model_converter')

# Try to handle missing dependencies gracefully
try:
    import tensorflow as tf
    from app.utils.model_utils import load_model_with_metadata, get_latest_model, convert_model_to_tflite
except ImportError as e:
    logger.error(f"Error: {str(e)}")
    logger.error("\nMissing dependencies. Please install required packages:")
    logger.error("pip install -r requirements.txt")
    sys.exit(1)

def convert_model():
    """Convert a trained TensorFlow model to TFLite format"""
    parser = argparse.ArgumentParser(description='Convert a trained model to TensorFlow Lite format')
    
    # Add command line arguments
    parser.add_argument('--model-path', type=str, help='Path to the trained model (.h5 file)')
    parser.add_argument('--model-dir', type=str, help='Directory containing models (used if --model-path not provided)')
    parser.add_argument('--output-path', type=str, help='Output path for TFLite model')
    parser.add_argument('--quantize', action='store_true', help='Apply quantization to reduce model size')
    
    args = parser.parse_args()
    
    # Define base paths if not provided
    base_dir = Path(__file__).parent
    
    model_path = args.model_path
    model_dir = args.model_dir
    
    if model_path is None:
        if model_dir is None:
            model_dir = base_dir / "app" / "models" / "quickdraw"
        else:
            model_dir = Path(model_dir)
        
        # Get the latest model
        model_path = get_latest_model(model_dir)
        if model_path is None:
            logger.error(f"No models found in directory: {model_dir}")
            sys.exit(1)
    else:
        model_path = Path(model_path)
        if not model_path.exists():
            logger.error(f"Model file not found: {model_path}")
            sys.exit(1)
    
    # Set output path if not provided
    if args.output_path:
        output_path = args.output_path
    else:
        # Use the same filename but with .tflite extension
        output_path = str(model_path).replace('.h5', '.tflite')
    
    # Load model
    try:
        logger.info(f"Loading model from {model_path}")
        model, metadata = load_model_with_metadata(model_path)
        
        if model is None:
            logger.error("Failed to load model")
            sys.exit(1)
            
        # Convert model to TFLite
        logger.info(f"Converting model to TFLite format{' with quantization' if args.quantize else ''}")
        tflite_path = convert_model_to_tflite(model, output_path, quantize=args.quantize)
        
        # Calculate size reduction
        original_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
        tflite_size = os.path.getsize(tflite_path) / (1024 * 1024)  # MB
        reduction = 100 * (1 - tflite_size / original_size)
        
        logger.info(f"Model conversion completed successfully!")
        logger.info(f"Original model size: {original_size:.2f} MB")
        logger.info(f"TFLite model size: {tflite_size:.2f} MB")
        logger.info(f"Size reduction: {reduction:.2f}%")
        logger.info(f"TFLite model saved to: {tflite_path}")
        
    except Exception as e:
        logger.error(f"Error during model conversion: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    convert_model()
