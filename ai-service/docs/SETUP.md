# AI Service Setup Guide

This document provides detailed instructions for setting up and running the Sketch Recognition AI service.

## Prerequisites

- Python 3.8-3.10 (recommended for TensorFlow compatibility)
- 4GB+ RAM (8GB+ recommended for model training)
- 5GB+ free disk space (for dataset and models)
- Internet connection (for downloading models and datasets)

## Environment Setup

### 1. Create and Activate Virtual Environment

```bash
# Navigate to the ai-service directory
cd ai-service

# Create virtual environment
python -m venv venv_tf

# Activate virtual environment
# On Windows:
venv_tf\Scripts\activate

# On macOS/Linux:
# source venv_tf/bin/activate
```

### 2. Install Dependencies

```bash
# Make sure you're in the activated virtual environment (venv_tf)
pip install -r requirements.txt
```

If you encounter TensorFlow compatibility issues:

```bash
# Fix for common incompatibility issues
pip install flask==2.0.3 werkzeug==2.0.3 tensorflow-cpu==2.10.0 protobuf==3.20.3
```

For OpenCV installation issues:

```bash
# Windows/macOS
pip install opencv-python

# Linux with additional dependencies
# sudo apt-get update && sudo apt-get install -y libgl1-mesa-glx
pip install opencv-python
```

## Dataset Setup

### 1. Download the Quick Draw Dataset

```bash
# List available categories
python download_dataset.py --list

# Download specific categories (recommended)
python download_dataset.py --categories apple bicycle car cat chair dog face fish house star tree umbrella airplane clock

# Download all default categories at once (14 categories)
python download_dataset.py --all

# Download with a limit of samples per category (for testing)
python download_dataset.py --categories apple car dog --limit 1000
```

### 2. Process the Dataset

Convert the raw NDJSON data to image format and create training/validation/test splits:

```bash
# Process specific categories
python process_dataset.py --categories apple bicycle car cat chair dog

# Process all downloaded categories
python process_dataset.py --all

# Process with visualization (to verify conversion)
python process_dataset.py --all --visualize

# Process with sample limit (for testing)
python process_dataset.py --all --limit 1000
```

## Model Training

### 1. Training Options

You can train different model architectures based on your requirements:

```bash
# Train Simple CNN (fastest, ~6 minutes)
python train_model.py --model-type simple --epochs 10 --batch-size 64

# Train Advanced CNN (better accuracy, ~1 hour)
python train_model.py --model-type advanced --epochs 20 --batch-size 32

# Train MobileNetV2 (best accuracy, ~2 hours)
python train_model.py --model-type mobilenet --epochs 20 --batch-size 32 --learning-rate 0.0005 --augmentation
```

For quick testing with limited data:

```bash
# Train with smaller dataset
python train_model.py --model-type simple --epochs 5 --max-per-class 500 --batch-size 32
```

### 2. Interactive Training with Jupyter Notebook

For more control and visualizations during training:

```bash
# Start Jupyter notebook server
jupyter notebook
```

Then open `notebooks/model_training.ipynb` in your browser and follow the instructions.

### 3. Model Evaluation

After training, evaluate your model:

```bash
# Test the model on the test set
python model_diagnostics.py --model-path app/models/quickdraw/quickdraw_model_mobilenet_*.h5
```

## Running the API Service

### 1. Configure Environment

Create a `.env` file in the ai-service directory:

```bash
# Create .env file
echo "MODEL_PATH=app/models/quickdraw/quickdraw_model_mobilenet_20250424_100007.h5" > .env
echo "PORT=5002" >> .env
echo "DEBUG=True" >> .env
```

### 2. Start the Service

```bash
# Start with default settings
python main.py

# Start with specific model
python main.py --model app/models/quickdraw/quickdraw_model_mobilenet_20250424_100007.h5

# Start with debugging enabled
python main.py --debug
```

By default, the service runs on `http://localhost:5002`.

## Testing the API

### 1. Create Test Images

```bash
# Save sample test images
python save_test_image.py
```

### 2. Using the Test Script

```bash
# Test with stroke data
python test_api.py

# Test with image file
python test_api.py --image test_images/apple.png

# Test with your own image
python test_api.py --image path/to/your/image.png
```

### 3. Testing API Endpoints Directly

#### Using PowerShell:

```powershell
# Test the API using PowerShell
Invoke-RestMethod -Uri "http://localhost:5002/api/recognize" -Method Post -Form @{
    image = Get-Item -Path "test_images/apple.png"
}
```

#### Using curl:

```bash
# Using curl
curl -F "image=@test_images/apple.png" http://localhost:5002/api/recognize
```

#### Using Python:

```python
import requests
response = requests.post("http://localhost:5002/api/recognize", 
                        files={"image": open("test_images/apple.png", "rb")})
print(response.json())
```

## Troubleshooting

### Common Issues

#### Model Loading Issues

If you see errors like "Exception encountered when calling Lambda.call()":

```bash
# Try using the model fix script
python fix_mobilenet_model.py --model app/models/quickdraw/your_model.h5
```

#### Connection Errors

If you receive "Connection refused" errors:
1. Verify the Flask service is running
2. Check the port number (default is 5002)
3. Ensure no firewall is blocking connections

#### Memory Errors

If you encounter "MemoryError" during dataset processing or training:
1. Reduce batch size (e.g., --batch-size 16)
2. Process fewer categories at once
3. Limit samples per category with --limit or --max-per-class

#### TensorFlow Installation

For TensorFlow compatibility issues:

```bash
# Reset and reinstall TensorFlow
pip uninstall -y tensorflow tensorflow-cpu
pip install tensorflow-cpu==2.10.0 protobuf==3.20.3
```

#### Image Processing Issues

If you encounter OpenCV or image processing errors:

```bash
# Verify basic image operations work
python -c "from PIL import Image; img = Image.new('RGB', (28, 28), color='white'); img.save('test.png')"

# Check if OpenCV works
python -c "import cv2; import numpy as np; img = np.zeros((28,28,3), np.uint8); cv2.imwrite('test_cv.png', img)"
```

## Deployment Considerations

For deploying to production:

1. Use TensorFlow Lite for more efficient inference:

```bash
# Convert your model to TensorFlow Lite
python -c "
from app.utils.model_utils import convert_model_to_tflite
import tensorflow as tf

# Load model
model = tf.keras.models.load_model('app/models/quickdraw/your_model.h5')

# Convert to TFLite
convert_model_to_tflite(model, 'app/models/quickdraw/model.tflite', quantize=True)
"
```

2. Set up proper logging for production:

```bash
# Disable debug mode in .env
echo "DEBUG=False" > .env

# Start with production settings
python main.py --log-level warning
```

3. Consider using Gunicorn for production deployment:

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn (for Linux/macOS)
gunicorn -w 4 -b 0.0.0.0:5002 "app:create_app()"
```
