# Sketch Recognition Game

A real-time collaborative sketching platform with AI recognition capabilities. Users can draw together on a shared canvas while an AI system recognizes sketches and enables Pictionary-style gameplay.

## Features

- **Real-time Collaborative Canvas**: Multi-user drawing with different colors and brush sizes, cursor position sharing, and undo/redo functionality
- **Sketch Recognition**: AI-powered recognition of sketches with confidence scores
- **Game Mode**: Pictionary-style gameplay with the AI as judge

## Project Structure

The project consists of three main components:

1. **Client**: React frontend application with Canvas API and Socket.io for real-time communication
2. **Server**: Node.js/Express backend with Socket.io for real-time updates and MongoDB for data storage
3. **AI Service**: Python Flask application with TensorFlow for sketch recognition

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.8-3.10 recommended for TensorFlow compatibility)
- MongoDB

### Client Setup

```bash
cd client
npm install
npm run dev
```

### Server Setup

```bash
cd server
npm install
npm run dev
```

### AI Service Setup

#### 1. Create Virtual Environment

```bash
cd ai-service

# On Windows:
python -m venv venv_tf
venv_tf\Scripts\activate

# On macOS/Linux:
# python3.10 -m venv venv_tf
# source venv_tf/bin/activate
```

#### 2. Install Dependencies

```bash
# Make sure you're in the activated virtual environment
pip install -r requirements.txt
```

For specific TensorFlow compatibility issues:
```bash
# Fix for common incompatibility issues
pip install flask==2.0.3 werkzeug==2.0.3 tensorflow-cpu==2.10.0 protobuf==3.20.3
```

#### 3. Download Dataset

Download the Quick Draw dataset (limited to 3000 images per category):

```bash
# List available categories
python download_dataset.py --list

# Download specific categories
python download_dataset.py --categories apple bicycle car cat chair dog

# Download all default categories (14 categories)
python download_dataset.py --all
```

#### 4. Process the Dataset

Process the raw dataset into training, validation, and test sets:

```bash
# Process specific categories
python process_dataset.py --categories apple bicycle car cat chair dog --visualize

# Process all available categories
python process_dataset.py --all --visualize
```

#### 5. Train the Model

Train a CNN model on the processed dataset:

```bash
# Train a simple CNN model (fastest)
python train_model.py --model-type simple --epochs 10 --batch-size 64

# Train a more advanced CNN with residual connections (better accuracy)
python train_model.py --model-type advanced --epochs 20 --batch-size 32

# Use MobileNetV2 transfer learning approach (best accuracy)
python train_model.py --model-type mobilenet --epochs 15 --batch-size 32
```

Additional training options:
```bash
# Train with limited data for quick testing
python train_model.py --model-type simple --epochs 5 --max-per-class 200
```

#### 6. Interactive Training with Jupyter Notebook

For interactive training with visualizations:

```bash
# Start Jupyter notebook
jupyter notebook
```

Then open the `notebooks/model_training.ipynb` notebook to run training with detailed visualizations.

#### 7. Start the Flask Service

Run the Flask server for sketch recognition:

```bash
# Start with the trained model
python main.py
```

The service will be available at http://localhost:5002 by default.

## Development Progress

### Completed
- ✅ Project structure setup and configuration
- ✅ Environment setup for all components
- ✅ Dataset download pipeline with 14 categories
- ✅ Raw dataset processing (NDJSON parsing, stroke rendering)
- ✅ Data splitting (train/validation/test)
- ✅ Multiple CNN model architectures:
  - ✅ Simple CNN (3 conv layers with batch normalization)
  - ✅ Advanced CNN (residual connections, deeper)
  - ✅ MobileNetV2 transfer learning
- ✅ Model training pipeline with:
  - ✅ Early stopping and checkpointing
  - ✅ Learning rate scheduling
  - ✅ Data augmentation
  - ✅ Training history visualization
- ✅ Model evaluation metrics (accuracy, confusion matrix)
- ✅ TensorFlow Lite model conversion
- ✅ Basic Flask API structure
- ✅ Documentation and setup guides

### Latest Achievements
- ✅ Successfully trained Simple CNN model with 64.48% validation accuracy
- ✅ Implemented automated model checkpointing and visualization
- ✅ Solved TensorFlow and Flask compatibility issues
- ✅ Created comprehensive model training notebook
- ✅ Optimized dataset pipeline for lower memory usage

### In Progress
- 🔄 Inference API endpoint integration
- 🔄 Real-time sketch recognition implementation
- 🔄 TensorFlow Lite model serving optimization
- 🔄 Training Advanced CNN and MobileNetV2 models
- 🔄 Client-side sketch-to-input conversion

## Training Results

Our initial training run with the Simple CNN architecture achieved promising results:

| Model Type | Training Accuracy | Validation Accuracy | Training Time | Epochs |
|------------|------------------|---------------------|---------------|--------|
| Simple CNN | 59.0%            | 64.48%              | 377s (~6.3m)  | 10     |

The model showed consistent improvement throughout training:
- Starting at 24.9% accuracy in epoch 1
- Reaching 64.48% validation accuracy by epoch 7
- Early stopping triggered after epoch 10, restoring best weights

**Next Steps:**
1. Train with more epochs to further improve accuracy
2. Experiment with advanced architectures
3. Implement the inference pipeline for real-time recognition

## Model Architecture Details

### Simple CNN Architecture
```
_________________________________________________________________
Layer (type)                 Output Shape              Param #   
=================================================================
Input                       (None, 28, 28, 1)          0         
Conv2D                      (None, 26, 26, 32)         320       
MaxPooling2D               (None, 13, 13, 32)         0         
BatchNormalization         (None, 13, 13, 32)         128       
Conv2D                      (None, 11, 11, 64)         18,496    
MaxPooling2D               (None, 5, 5, 64)           0         
BatchNormalization         (None, 5, 5, 64)           256       
Conv2D                      (None, 3, 3, 128)          73,856    
MaxPooling2D               (None, 1, 1, 128)          0         
BatchNormalization         (None, 1, 1, 128)          512       
Flatten                     (None, 128)                0         
Dropout                     (None, 128)                0         
Dense                       (None, 256)                33,024    
BatchNormalization         (None, 256)                1,024     
Dropout                     (None, 256)                0         
Dense                       (None, 14)                 3,598     
=================================================================
Total params: 131,214
Trainable params: 130,254
Non-trainable params: 960
```

## Dataset Information

The project uses the Google Quick Draw dataset with 14 categories:
- airplane, apple, bicycle, car, cat, chair, clock, dog, face, fish, house, star, tree, umbrella

Each category includes 3,000 drawing samples, for a total of 42,000 sketches.

**Dataset Split:**
- Training: 29,400 images (70%)
- Validation: 6,300 images (15%)
- Test: 6,300 images (15%)

## Troubleshooting

### TensorFlow Installation

If you encounter TensorFlow installation issues:

```bash
# For Windows with Python 3.8-3.10:
pip install tensorflow-cpu==2.10.0 protobuf==3.20.3

# For Flask compatibility issues:
pip install flask==2.0.3 werkzeug==2.0.3
```

### Common Python Environment Issues

- **"ModuleNotFoundError: No module named 'tensorflow'"**:
  - Ensure you've activated the virtual environment
  - Try reinstalling with `pip install tensorflow-cpu==2.10.0`

- **"No module named 'app'"**:
  - Run Python from the project root directory
  - Ensure `app` directory contains `__init__.py`

- **"Error: cannot import name 'url_quote' from 'werkzeug.urls'"**:
  - Downgrade Werkzeug: `pip install werkzeug==2.0.3 flask==2.0.3`

### Dataset Processing Issues

- **"MemoryError" during processing**:
  - Reduce batch size or process fewer categories at a time
  - Use `--max-samples` to limit samples per category

- **Disk space warnings**:
  - Each category requires ~250MB for raw data
  - Check disk space before downloading all categories

## License

[MIT](LICENSE)