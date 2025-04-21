# AI Service Installation Guide

This guide helps you set up the environment for the AI service component of the Collaborative Sketch Recognition project.

## Quick Start (Windows)

```bash
# Create and set up virtual environment
setup_env.bat

# Activate the environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Manual Setup

### 1. Create Virtual Environment

#### Windows:
```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip
```

#### macOS/Linux:
```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip
```

### 2. Install Requirements

```bash
pip install -r requirements.txt
```

### 3. TensorFlow Installation Troubleshooting

If you encounter issues installing TensorFlow:

1. **Try installing just TensorFlow CPU version:**
   ```bash
   pip install tensorflow-cpu==2.7.0
   ```

2. **Use an alternative ML framework:**
   ```bash
   pip install onnxruntime scikit-learn
   ```

3. **Check your Python version:**
   TensorFlow works best with Python 3.8-3.10. Consider downgrading Python if using a newer version.

## Using the Quick Draw Dataset

After setting up the environment:

1. **Download dataset:**
   ```bash
   python download_dataset.py --list       # See available categories
   python download_dataset.py --categories apple cat house  # Download specific categories
   ```

2. **Process data:**
   ```bash
   python -m app.services.data_processor   # Process raw data into training format
   ```

## Testing the Setup

Verify your installation:

```bash
python -c "import tensorflow as tf; print(f'TensorFlow version: {tf.__version__}')"
python -c "import numpy as np; import cv2; print(f'OpenCV version: {cv2.__version__}')"
```

## Common Issues

1. **ImportError: DLL load failed**: Install the [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
2. **No module named 'tensorflow'**: Try `pip install tensorflow-cpu==2.7.0` specifically
3. **Memory errors during dataset processing**: Reduce batch size in data processing scripts
