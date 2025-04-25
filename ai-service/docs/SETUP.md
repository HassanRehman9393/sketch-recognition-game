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
# Fix for common dependency conflicts (TensorFlow and protobuf)
# Option 1: Install compatible versions separately
pip uninstall -y tensorflow tensorflow-cpu tensorflow-intel protobuf
pip install tensorflow-cpu==2.10.0 
pip install protobuf==3.19.6  # This version is compatible with TensorFlow 2.10.0

# Option 2: Install specific compatible versions in one command
pip install flask==2.0.3 werkzeug==2.0.3 tensorflow-cpu==2.10.0 protobuf==3.19.6
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

For this project, we use a reduced dataset configuration with 5 specific categories and 5000 images per category for faster development and testing:

### 1. Download the Reduced Dataset

```bash
# Make sure you're in the root ai-service directory
cd ai-service

# Download only 5 categories with 5000 samples each
python scripts/download_dataset.py --categories apple bicycle cat house airplane --limit 5000
```

The downloaded data will be stored in the `data/raw` directory.

### 2. Process the Dataset

Convert the raw NDJSON data to image format and create training/validation/test splits:

```bash
# Process the 5 categories (make sure you've downloaded them first)
python scripts/process_dataset.py --categories apple bicycle cat house airplane --max-samples 5000
```

The processed data will be stored in the `data/processed` directory.

### 3. Verifying Processed Images

After processing, check that the generated images look correct:

```bash
# Quick command to view a sample processed image (requires display capability)
python -c "import cv2; import matplotlib.pyplot as plt; img = cv2.imread('data/processed/images/apple/apple_0_norm.png'); plt.imshow(img); plt.show()"
```

You should see recognizable sketch outlines in the processed images. If the images appear blank or all white, there may be an issue with the processing pipeline.

### 4. Workflow Order

Note: Make sure to follow these steps in order:
1. First download the dataset using `download_dataset.py`
2. Then process the dataset with `process_dataset.py`
3. Finally train the model with `train_model.py`

This configuration requires less storage space and significantly speeds up training while still providing sufficient data for testing and development purposes.

## Model Training with MobileNetV2

The model training uses a two-phase approach for optimal transfer learning:

### 1. Phase 1: Training the Classification Head

In the first phase, we freeze the base MobileNetV2 model and train only the classification head:

```bash
# Train MobileNetV2 Phase 1 (classification head only)
python scripts/train_model.py --model-type mobilenet --phase 1 --epochs 10 --batch-size 64 --learning-rate 0.001 --augmentation
```

### 2. Phase 2: Fine-tuning the Model

After training the classification head, fine-tune the top layers of the MobileNetV2 model with a lower learning rate:

```bash
# Train MobileNetV2 Phase 2 (fine-tuning)
python scripts/train_model.py --model-type mobilenet --phase 2 --epochs 20 --batch-size 64 --learning-rate 0.0001 --augmentation
```

### 3. Additional Training Options

Create confusion matrix and classification report:
```bash
# Train with confusion matrix generation
python scripts/train_model.py --model-type mobilenet --phase 1 --confusion-matrix
```

Convert to TensorFlow Lite for deployment:
```bash
# Train and convert to TFLite
python scripts/train_model.py --model-type mobilenet --phase 2 --convert-tflite --quantize
```

For quick testing with limited data:
```bash
# Train with smaller dataset
python scripts/train_model.py --model-type mobilenet --phase 1 --max-per-class 500 --batch-size 32
```

### 4. Interactive Training with Jupyter Notebook

For more control and visualizations during training:

```bash
# Start Jupyter notebook server
jupyter notebook
```

Then open `notebooks/model_training.ipynb` in your browser and follow the instructions.

### 5. Model Evaluation

After training, evaluate your model:

```bash
# Test the model on the test set
python scripts/model_diagnostics.py --model-path app/models/quickdraw/quickdraw_model_mobilenet_*.h5
```

## Running the API Service

### 1. Configure Environment

Create a `.env` file in the ai-service directory:

```bash
# Create .env file
echo "MODEL_PATH=app/models/quickdraw/quickdraw_model_mobilenet_*.h5" > .env
echo "PORT=5002" >> .env
echo "DEBUG=True" >> .env
```

### 2. Start the Service

```bash
# Start with default settings
python scripts/main.py
```

By default, the service runs on `http://localhost:5002`.

## Testing the API

### 1. Create Test Images

```bash
# Save sample test images
python scripts/save_test_image.py
```

### 2. Using the Test Script

```bash
# Test with image file
python scripts/test_api.py --image test_images/apple.png
```

### 3. Testing API Endpoints Directly

```python
import requests
response = requests.post("http://localhost:5002/api/recognize", 
                        files={"image": open("test_images/apple.png", "rb")})
print(response.json())
```

## Troubleshooting

### Common Issues

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
pip install tensorflow-cpu==2.10.0 protobuf==3.19.6
```

#### Image Processing Issues

If you encounter OpenCV or image processing errors:

```bash
# Verify basic image operations work
python -c "from PIL import Image; img = Image.new('RGB', (28, 28), color='white'); img.save('test.png')"
```
