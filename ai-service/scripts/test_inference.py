import sys
from pathlib import Path
import argparse
import numpy as np
import cv2
import json
import requests
import time
import matplotlib.pyplot as plt

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.recognition import SketchRecognitionService

def test_local_inference(image_path):
    """Test local inference with the recognition service"""
    print(f"Testing local inference with image: {image_path}")
    
    # Load image
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        print(f"Error: Could not load image {image_path}")
        return
    
    # Initialize recognition service
    service = SketchRecognitionService()
    
    # Perform recognition
    start_time = time.time()
    results = service.recognize_sketch(image)
    processing_time = (time.time() - start_time) * 1000  # ms
    
    # Print results
    print("\nRecognition Results:")
    print(f"Processing time: {processing_time:.2f} ms")
    
    if results['success'] and 'predictions' in results:
        print("\nTop predictions:")
        for i, pred in enumerate(results['predictions'][:5]):  # Top 5 predictions
            print(f"  {i+1}. {pred['class']}: {pred['confidence']}%")
    else:
        print(f"Error: {results.get('error', 'Unknown error')}")
    
    # Display the image
    plt.figure(figsize=(5, 5))
    plt.imshow(image, cmap='gray')
    plt.title(f"Recognized as: {results['predictions'][0]['class']}")
    plt.axis('off')
    plt.show()

def test_api_endpoint(image_path, endpoint_url="http://localhost:5002/api/recognize"):
    """Test the API endpoint with an image"""
    print(f"Testing API endpoint with image: {image_path}")
    
    # Send request to API
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            start_time = time.time()
            response = requests.post(endpoint_url, files=files)
            processing_time = (time.time() - start_time) * 1000  # ms
        
        # Print results
        if response.status_code == 200:
            results = response.json()
            print("\nAPI Response:")
            print(f"Status code: {response.status_code}")
            print(f"Processing time: {processing_time:.2f} ms")
            print(f"API reported processing time: {results.get('processing_time_ms', 'N/A')} ms")
            
            if 'predictions' in results:
                print("\nTop predictions:")
                for i, pred in enumerate(results['predictions'][:5]):  # Top 5 predictions
                    print(f"  {i+1}. {pred['class']}: {pred['confidence']}%")
            else:
                print(f"Error: {results.get('error', 'Unknown error')}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error sending request: {e}")

def main():
    parser = argparse.ArgumentParser(description='Test sketch recognition inference')
    parser.add_argument('--image', type=str, required=True, help='Path to image file')
    parser.add_argument('--api', action='store_true', help='Test API endpoint instead of local inference')
    parser.add_argument('--url', type=str, default="http://localhost:5002/api/recognize", 
                        help='API endpoint URL (default: http://localhost:5002/api/recognize)')
    
    args = parser.parse_args()
    
    if args.api:
        test_api_endpoint(args.image, args.url)
    else:
        test_local_inference(args.image)

if __name__ == "__main__":
    main()
