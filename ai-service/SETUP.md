# AI Service Setup Guide

This guide helps you set up the AI service for the Collaborative Sketch Recognition project.

## Prerequisites

- Python 3.8-3.10 (recommended for TensorFlow compatibility)
- pip (Python package installer)
- Git

## Setup Instructions

### 1. Create a Virtual Environment

A virtual environment isolates the project dependencies from your system Python.

#### Windows:
```powershell
# Navigate to the ai-service directory
cd "d:\Semester 6\AI\AI Project\ai-service"

# Create the virtual environment
python setup_env.py
# OR manually:
# python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate
```

#### macOS/Linux:
```bash
# Navigate to the ai-service directory
cd "/path/to/AI Project/ai-service"

# Create the virtual environment
python setup_env.py
# OR manually:
# python -m venv venv

# Activate the virtual environment
source venv/bin/activate
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
   pip install tensorflow-cpu==2.7.0
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
python -m app.services.data_processor
```

### 5. Run the Flask Application

Start the Flask application:

```
python main.py
```

By default, the application will run on http://localhost:5000.

## Project Structure

- `app/`: Main application code
  - `datasets/`: Raw and processed dataset storage
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
