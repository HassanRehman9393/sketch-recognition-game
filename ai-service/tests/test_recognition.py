"""
Test script for the sketch recognition API
This script tests various ways to submit images to the recognition API
and analyze the results.
"""

import argparse
import requests
import json
import base64
from PIL import Image, ImageDraw, ImageOps
import numpy as np
import io
import time
from pathlib import Path
import matplotlib.pyplot as plt

# Set up constants
DEFAULT_API_URL = "http://localhost:5002"
DEFAULT_ENDPOINT = "/api/recognize"
TEST_IMAGES_DIR = Path("test_images")
DEBUG_DIR = Path("debug_out")

def ensure_dirs():
    """Ensure necessary directories exist"""
    TEST_IMAGES_DIR.mkdir(exist_ok=True)
    DEBUG_DIR.mkdir(exist_ok=True)

def create_test_images():
    """Create various test images for testing recognition"""
    image_paths = {}
    
    # Create standard shapes
    shapes = {
        'circle': lambda draw, size: draw.ellipse([size//4, size//4, 3*size//4, 3*size//4], outline=0, width=size//10),
        'square': lambda draw, size: draw.rectangle([size//4, size//4, 3*size//4, 3*size//4], outline=0, width=size//10),
        'triangle': lambda draw, size: draw.polygon([(size//2, size//4), (size//4, 3*size//4), (3*size//4, 3*size//4)], outline=0, width=size//10),
        'star': lambda draw, size: draw.polygon([
            (size//2, size//10), (size//2+size//8, size//2-size//8), 
            (size-size//10, size//2), (size//2+size//8, size//2+size//8),
            (size//2, size-size//10), (size//2-size//8, size//2+size//8),
            (size//10, size//2), (size//2-size//8, size//2-size//8)
        ], outline=0, width=size//20),
        'line': lambda draw, size: draw.line([(size//4, size//4), (3*size//4, 3*size//4)], fill=0, width=size//10)
    }
    
    # Generate at two sizes: 28x28 (model input size) and 128x128 (higher resolution)
    for size in [28, 128]:
        for name, draw_func in shapes.items():
            # Create blank white image
            img = Image.new('L', (size, size), 255)
            draw = ImageDraw.Draw(img)
            
            # Draw shape
            draw_func(draw, size)
            
            # Save image
            img_path = TEST_IMAGES_DIR / f"{name}_{size}.png"
            img.save(img_path)
            
            # Save inverted version (black background, white shape)
            inverted = ImageOps.invert(img)
            inv_path = TEST_IMAGES_DIR / f"{name}_{size}_inverted.png"
            inverted.save(inv_path)
            
            # Add to paths dictionary
            image_paths[f"{name}_{size}"] = str(img_path)
            image_paths[f"{name}_{size}_inverted"] = str(inv_path)
    
    print(f"Created {len(image_paths)} test images in {TEST_IMAGES_DIR}")
    return image_paths

def load_and_process_image(image_path, target_size=None, invert=False):
    """Load and preprocess image for API submission"""
    # Load image
    img = Image.open(image_path)
    
    # Convert to grayscale
    if img.mode != 'L':
        img = img.convert('L')
    
    # Resize if target_size specified
    if target_size:
        img = img.resize(target_size, Image.LANCZOS)
    
    # Invert if specified
    if invert:
        img = ImageOps.invert(img)
    
    return img

def image_to_base64(img, format='PNG'):
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f'data:image/{format.lower()};base64,{img_str}'

def test_recognition_with_file(api_url, img_path, debug=False):
    """Test recognition endpoint using multipart file upload"""
    print(f"\n--- Testing Recognition with File Upload: {img_path} ---")
    
    try:
        # Open the file
        with open(img_path, 'rb') as f:
            # Create multipart form data
            files = {'image': (os.path.basename(img_path), f, 'image/png')}
            
            # Send request
            start_time = time.time()
            response = requests.post(f"{api_url}/api/recognize", files=files)
            end_time = time.time()
            
            # Process response
            print(f"Response time: {end_time - start_time:.2f}s")
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Save response for debugging
                if debug:
                    with open(DEBUG_DIR / f"{os.path.basename(img_path)}_response.json", 'w') as f:
                        json.dump(data, f, indent=2)
                
                # Print predictions
                if data.get('success', False) and 'predictions' in data:
                    predictions = data['predictions'].get('top_predictions', [])
                    print("\nTop predictions:")
                    for i, pred in enumerate(predictions):
                        print(f"{i+1}. {pred.get('class')}: {pred.get('confidence', 0)*100:.2f}%")
                    
                    print(f"\nProcessing time: {data.get('processing_time', 0):.4f}s")
                else:
                    print(f"Error: {data.get('error', 'Unknown error')}")
            else:
                print(f"Error: {response.text}")
                
            return response.json() if response.status_code == 200 else None
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_recognition_with_base64(api_url, img_path, debug=False):
    """Test recognition endpoint using base64 encoded image"""
    print(f"\n--- Testing Recognition with Base64: {img_path} ---")
    
    try:
        # Load and convert image to base64
        img = load_and_process_image(img_path)
        img_base64 = image_to_base64(img)
        
        # Create JSON payload
        payload = {'image_data': img_base64}
        
        # Send request
        start_time = time.time()
        response = requests.post(
            f"{api_url}/api/recognize", 
            json=payload, 
            headers={'Content-Type': 'application/json'}
        )
        end_time = time.time()
        
        # Process response
        print(f"Response time: {end_time - start_time:.2f}s")
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Save response for debugging
            if debug:
                with open(DEBUG_DIR / f"{os.path.basename(img_path)}_base64_response.json", 'w') as f:
                    json.dump(data, f, indent=2)
            
            # Print predictions
            if data.get('success', False) and 'predictions' in data:
                predictions = data['predictions'].get('top_predictions', [])
                print("\nTop predictions:")
                for i, pred in enumerate(predictions):
                    print(f"{i+1}. {pred.get('class')}: {pred.get('confidence', 0)*100:.2f}%")
                
                print(f"\nProcessing time: {data.get('processing_time', 0):.4f}s")
            else:
                print(f"Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"Error: {response.text}")
            
        return response.json() if response.status_code == 200 else None
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_preprocessing_debug(api_url, img_path):
    """Test image preprocessing debug endpoint"""
    print(f"\n--- Testing Preprocessing Debug: {img_path} ---")
    
    try:
        # Open the file
        with open(img_path, 'rb') as f:
            # Create multipart form data
            files = {'image': (os.path.basename(img_path), f, 'image/png')}
            
            # Send request to debug endpoint
            response = requests.post(f"{api_url}/api/recognize/debug", files=files)
            
            # Process response
            print(f"Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Save response for debugging
                with open(DEBUG_DIR / f"{os.path.basename(img_path)}_debug.json", 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Print debug info
                if data.get('success', False):
                    print("\nDebug information:")
                    
                    # Image properties
                    if 'image_size' in data:
                        print(f"Image size: {data['image_size']}")
                        print(f"Image mode: {data['image_mode']}")
                    
                    # Processed image stats
                    if 'processed_shape' in data:
                        print(f"Processed shape: {data['processed_shape']}")
                        print(f"Processed values - min: {data['processed_min']:.4f}, max: {data['processed_max']:.4f}, mean: {data['processed_mean']:.4f}")
                    
                    # Features
                    if 'features' in data:
                        print("\nImage features:")
                        features = data['features']
                        for key, value in features.items():
                            print(f"  {key}: {value}")
                else:
                    print(f"Error: {data.get('error', 'Unknown error')}")
            else:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"Error: {str(e)}")

def compare_all_shapes(api_url):
    """Compare recognition results for all shape types"""
    print("\n--- Comparing All Shape Types ---")
    
    results = {}
    
    # Test each shape
    for shape in ['circle', 'square', 'triangle', 'star', 'line']:
        # Test both standard and inverted versions
        for inversion in ['', '_inverted']:
            img_path = TEST_IMAGES_DIR / f"{shape}_128{inversion}.png"
            if img_path.exists():
                print(f"\nTesting {shape}{inversion}...")
                result = test_recognition_with_file(api_url, str(img_path))
                
                if result and result.get('success') and 'predictions' in result:
                    # Store top prediction for this shape
                    top_pred = result['predictions']['top_predictions'][0]
                    results[f"{shape}{inversion}"] = {
                        'class': top_pred.get('class', 'unknown'),
                        'confidence': top_pred.get('confidence', 0)
                    }
    
    # Display results in a table
    print("\n--- Recognition Results Summary ---")
    print(f"{'Shape':<15} {'Top Prediction':<15} {'Confidence':<10}")
    print("-" * 45)
    
    for shape, data in results.items():
        print(f"{shape:<15} {data['class']:<15} {data['confidence']*100:.2f}%")
    
    # Check if different shapes get different predictions
    unique_predictions = set(data['class'] for data in results.values())
    print(f"\nNumber of unique predictions: {len(unique_predictions)}")
    print(f"Unique classes: {', '.join(unique_predictions)}")
    
    if len(unique_predictions) < len(results) / 2:
        print("\nWARNING: Many shapes are classified as the same class!")
        print("This suggests the model might not be correctly processing different inputs.")
    else:
        print("\nDifferent shapes are correctly classified as different classes.")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Test the sketch recognition API')
    parser.add_argument('--url', type=str, default=DEFAULT_API_URL, help='API base URL')
    parser.add_argument('--image', type=str, help='Path to test image')
    parser.add_argument('--create-samples', action='store_true', help='Create sample test images')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--compare-all', action='store_true', help='Compare recognition for all shape types')
    
    args = parser.parse_args()
    
    # Ensure directories exist
    ensure_dirs()
    
    # Create test images if requested
    if args.create_samples:
        create_test_images()
    
    # Test with specified image
    if args.image:
        test_recognition_with_file(args.url, args.image, args.debug)
        test_recognition_with_base64(args.url, args.image, args.debug)
        
        # Test preprocessing debug endpoint
        if args.debug:
            test_preprocessing_debug(args.url, args.image)
    
    # Compare all shape types
    if args.compare_all:
        compare_all_shapes(args.url)
        
    # If no specific test requested and no image provided
    if not args.image and not args.create_samples and not args.compare_all:
        print("No specific test requested.")
        print("Use --image PATH to test with a specific image")
        print("Use --create-samples to create test images")
        print("Use --compare-all to test all shape types")

if __name__ == "__main__":
    import os  # Import needed for os.path.basename
    main()
