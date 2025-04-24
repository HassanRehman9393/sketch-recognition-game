"""
Simple script to test if a model can be successfully loaded and run
"""

import tensorflow as tf
import numpy as np
import argparse
import json
import os

def main():
    parser = argparse.ArgumentParser(description="Test if a model can be loaded and run")
    parser.add_argument('--model', type=str, required=True,
                        help="Path to the model file")
    
    args = parser.parse_args()
    model_path = args.model
    
    print(f"Attempting to load model from {model_path}")
    
    # Try to load metadata
    metadata_path = model_path.replace('.h5', '.json')
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            print(f"Found metadata: {metadata.keys()}")
            if 'class_names' in metadata:
                print(f"Classes: {metadata['class_names']}")
        except Exception as e:
            print(f"Error loading metadata: {e}")
    
    try:
        # Try to load the model
        model = tf.keras.models.load_model(model_path)
        print("Model loaded successfully!")
        
        # Show summary
        model.summary()
        
        # Create random test input based on model input shape
        input_shape = model.input_shape
        print(f"Model input shape: {input_shape}")
        
        # Create random test data
        test_input = np.random.random((1,) + input_shape[1:])
        print(f"Test input shape: {test_input.shape}")
        
        # Run inference
        print("Running inference with random data...")
        predictions = model.predict(test_input)
        
        print(f"Prediction shape: {predictions.shape}")
        print(f"Top predicted class: {np.argmax(predictions[0])}")
        print(f"Confidence: {np.max(predictions[0]):.4f}")
        
        print("\nModel loaded and tested successfully!")
        
    except Exception as e:
        print(f"Error loading or running the model: {str(e)}")

if __name__ == "__main__":
    main()
