import argparse
import requests
import json
import base64
import os
from PIL import Image
import time

def test_api_status(url):
    """Test the API status endpoint"""
    print(f"Testing API status at {url}/api/status")
    try:
        response = requests.get(f"{url}/api/status")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("API is online!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_api_classes(url):
    """Test the API classes endpoint"""
    print(f"\nTesting API classes at {url}/api/classes")
    try:
        response = requests.get(f"{url}/api/classes")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Classes retrieved successfully!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_api_recognize_file(url, image_path):
    """Test the API recognize endpoint with a file"""
    print(f"\nTesting API recognize with file upload at {url}/api/recognize")
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(f"{url}/api/recognize", files=files)
            
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Recognition successful!")
            result = response.json()
            
            # Fix the way we access predictions in the response
            if 'predictions' in result:
                # Handle case where predictions might be under a nested key
                predictions = result['predictions']
                if isinstance(predictions, dict) and 'top_predictions' in predictions:
                    predictions = predictions['top_predictions']
                
                print("\nTop predictions:")
                # Handle prediction array
                if isinstance(predictions, list):
                    for i, pred in enumerate(predictions):
                        if isinstance(pred, dict) and 'class' in pred and 'confidence' in pred:
                            print(f"  {i+1}. {pred['class']}: {pred['confidence']}%")
                        else:
                            print(f"  {i+1}. {pred}")
                else:
                    print("Predictions format not recognized")
                    print(json.dumps(predictions, indent=2))
                
                # Display processing time if available
                if 'processing_time_ms' in result:
                    print(f"\nProcessing time: {result['processing_time_ms']} ms")
                elif 'processing_time' in result:
                    print(f"\nProcessing time: {result['processing_time']} s")
            else:
                print(json.dumps(result, indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_api_recognize_base64(url, image_path):
    """Test the API recognize endpoint with base64 encoded image"""
    print(f"\nTesting API recognize with base64 at {url}/api/recognize")
    try:
        # Read image and convert to base64
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
        # Create payload
        payload = {
            'image_data': f'data:image/png;base64,{image_base64}'
        }
        
        # Send request
        response = requests.post(
            f"{url}/api/recognize", 
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Recognition successful!")
            result = response.json()
            
            # Fix the way we access predictions in the response
            if 'predictions' in result:
                # Handle case where predictions might be under a nested key
                predictions = result['predictions']
                if isinstance(predictions, dict) and 'top_predictions' in predictions:
                    predictions = predictions['top_predictions']
                
                print("\nTop predictions:")
                # Handle prediction array
                if isinstance(predictions, list):
                    for i, pred in enumerate(predictions):
                        if isinstance(pred, dict) and 'class' in pred and 'confidence' in pred:
                            print(f"  {i+1}. {pred['class']}: {pred['confidence']}%")
                        else:
                            print(f"  {i+1}. {pred}")
                else:
                    print("Predictions format not recognized")
                    print(json.dumps(predictions, indent=2))
                
                # Display processing time if available
                if 'processing_time_ms' in result:
                    print(f"\nProcessing time: {result['processing_time_ms']} ms")
                elif 'processing_time' in result:
                    print(f"\nProcessing time: {result['processing_time']} s")
            else:
                print(json.dumps(result, indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Test the Sketch Recognition API')
    parser.add_argument('--url', type=str, default='http://localhost:5002',
                        help='Base URL for the API')
    parser.add_argument('--image', type=str, 
                        help='Path to an image file for recognition testing')
    parser.add_argument('--all', action='store_true',
                        help='Run all tests')
    
    args = parser.parse_args()
    
    # Always test status endpoint
    test_api_status(args.url)
    
    # Test classes endpoint
    test_api_classes(args.url)
    
    # Test recognition endpoints if image is provided or if all tests are requested
    if args.image:
        if os.path.exists(args.image):
            test_api_recognize_file(args.url, args.image)
            test_api_recognize_base64(args.url, args.image)
        else:
            print(f"Error: Image file not found: {args.image}")
    elif args.all:
        print("\nWarning: No image path provided. Skipping recognition tests.")
        print("Use --image PATH to test recognition endpoints")

if __name__ == "__main__":
    main()
