# AI Service Setup Guide

This guide helps you set up the AI service for the Collaborative Sketch Recognition project.

## Prerequisites

- Python 3.8-3.10 (recommended for TensorFlow compatibility)
- pip (Python package installer)
- Git

## Setup Instructions

### 1. Create a Virtual Environment

A virtual environment isolates the project dependencies from your system Python.

#### Creating with Python 3.10 (Recommended)

```powershell
# Navigate to the ai-service directory
cd "d:\Semester 6\AI\AI Project\ai-service"

# Create the virtual environment using Python 3.10
"C:\Path\To\Python310\python.exe" -m venv venv_tf
# Note: Replace C:\Path\To\Python310\python.exe with your actual Python 3.10 path

# Activate the virtual environment
.\venv_tf\Scripts\activate
```

#### Alternative with System Python

```powershell
# Navigate to the ai-service directory
cd "d:\Semester 6\AI\AI Project\ai-service"

# Create the virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate
```

#### macOS/Linux:
```bash
# Navigate to the ai-service directory
cd "/path/to/AI Project/ai-service"

# Create the virtual environment
python -m venv venv_tf
# OR use python3.10 specifically:
# python3.10 -m venv venv_tf

# Activate the virtual environment
source venv_tf/bin/activate
```

### 2. Install Dependencies

After activating the virtual environment, install the required dependencies:

```
pip install -r requirements.txt
```

#### Troubleshooting TensorFlow Installation

If you encounter issues installing TensorFlow:

1. **Windows users**: Try installing a specific version:
   ```
   pip install tensorflow-cpu==2.10.0
   ```

2. **Alternative ML frameworks**: If TensorFlow still fails, uncomment one of the alternative options in requirements.txt:
   ```
   pip install onnxruntime keras
   ```

3. **Python version**: TensorFlow works best with Python 3.8-3.10. Consider downgrading Python if using a newer version.

### 3. Download the Quick Draw Dataset

Use the provided script to download the dataset:

```
# List available categories
python download_dataset.py --list

# Download specific categories
python download_dataset.py --categories apple cat house

# Download all default categories
python download_dataset.py --all
```

### 4. Process the Raw Dataset

After downloading the raw data, process it into a format suitable for training:

```
# List available categories for processing
python process_dataset.py --list

# Process specific categories
python process_dataset.py --categories apple cat house --visualize

# Process all available categories
python process_dataset.py --all --max-samples 1000 --visualize
```

The processing steps include:
- Extracting stroke data from raw NDJSON files
- Converting strokes to normalized images
- Splitting the dataset into training/validation/test sets
- Generating visualizations of processed examples (if --visualize is specified)

### 5. Train the Model

Train a CNN model on the processed dataset:

```bash
# Train a simple CNN model
python train_model.py --model-type simple --epochs 10 --batch-size 64

# Train a more advanced CNN with residual connections
python train_model.py --model-type advanced --epochs 20 --batch-size 32

# Use MobileNetV2 transfer learning approach (requires more memory)
python train_model.py --model-type mobilenet --epochs 15 --batch-size 32
```

Additional training options:
```bash
# Limit data for quick testing
python train_model.py --max-per-class 200

# Disable data augmentation
python train_model.py --no-augmentation
```

### 6. Run the Flask Application

Start the Flask application:

```
python main.py
```

By default, the application will run on http://localhost:5000.

## Project Structure

- `app/`: Main application code
  - `datasets/`: Raw and processed dataset storage
    - `raw/`: Downloaded NDJSON files
    - `processed/`: Processed images and training splits
      - `images/`: Converted stroke data as PNG images
      - `train/`: Training split
      - `valid/`: Validation split
      - `test/`: Test split
      - `visualizations/`: Example visualizations
  - `models/quickdraw/`: Trained model storage
  - `services/`: Core business logic
  - `utils/`: Utility functions
- `notebooks/`: Jupyter notebooks for model training
- `requirements.txt`: Project dependencies
- `main.py`: Application entry point

## Troubleshooting

- **Disk Space**: Each Quick Draw category is ~250MB. Ensure you have sufficient disk space.
- **Memory Issues**: Processing large datasets requires significant RAM. Reduce batch sizes if needed.
- **GPU Support**: For faster training, install TensorFlow with GPU support if you have a compatible NVIDIA GPU.
- **TensorFlow and Werkzeug Compatibility**: If you encounter errors related to Werkzeug URLs, make sure you have compatible versions:
  ```
  pip install flask==2.0.3 werkzeug==2.0.3
  ```
- **Multiple Python Installations**: If you have multiple Python versions installed, make sure to specify the path to Python 3.10 explicitly:
  ```
  "C:\Path\To\Python310\python.exe" -m venv venv_tf
  ```
