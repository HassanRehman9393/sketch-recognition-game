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
python -m venv venv
venv\Scripts\activate

# On macOS/Linux:
# python -m venv venv
# source venv/bin/activate
```

#### 2. Install Dependencies

```bash
# Make sure you're in the activated virtual environment
pip install -r requirements.txt

# If TensorFlow installation fails, try these alternatives:
# pip install tensorflow-cpu==2.7.0
# or
# pip install onnxruntime scikit-learn
```

#### 3. Download Dataset

Download the Quick Draw dataset (limited to 3000 images per category for manageable training):

```bash
# List available categories
python download_dataset.py --list

# Download specific categories
python download_dataset.py --categories apple cat house

# Download all default categories
python download_dataset.py --all
```

#### 4. Process the Dataset

Process the raw dataset into training, validation, and test sets:

```bash
# Process specific categories (limit to 1000 samples per category)
python process_dataset.py --categories apple cat house --max-samples 1000

# Process all available categories
python process_dataset.py --all --max-samples 1000

# Only split existing processed data without reprocessing
python process_dataset.py --split-only
```

#### 5. Train the Model

Train a CNN model on the processed dataset:

```bash
# Train a simple CNN model
python train_model.py --model-type simple --epochs 20 --batch-size 64

# Train a more advanced CNN with residual connections
python train_model.py --model-type advanced --epochs 30 --batch-size 32

# Use MobileNetV2 transfer learning approach (requires more memory)
python train_model.py --model-type mobilenet --epochs 15 --batch-size 32
```

Additional training options:
```bash
# Limit data for quick testing
python train_model.py --max-per-class 200

# Specify GPU to use (if you have multiple)
python train_model.py --gpu 0

# Disable data augmentation
python train_model.py --no-augmentation
```

#### 6. Interactive Training with Jupyter Notebook

For more detailed analysis and visualization during training:

```bash
# Start Jupyter notebook
jupyter notebook
```

Then open the `notebooks/model_training.ipynb` notebook to run the training interactively.

## Development Progress

### Completed
- ✅ Project structure setup and configuration
- ✅ Environment setup for client, server, and AI service
- ✅ Basic Flask API setup for the AI service
- ✅ Dataset download functionality with customizable category selection
- ✅ Download script with built-in limitations (3000 images per category)
- ✅ Image processing utilities for sketch normalization
- ✅ Data backup functionality for downloaded categories
- ✅ Raw dataset processing pipeline
   - ✅ Parse NDJSON files to extract stroke data
   - ✅ Convert strokes to normalized images
   - ✅ Visualize processed drawings
   - ✅ Split data into training/validation/test sets
- ✅ CNN model architecture implementation
   - ✅ Simple CNN architecture
   - ✅ Advanced CNN with residual connections
   - ✅ Transfer learning with MobileNetV2
- ✅ Model training pipeline
   - ✅ Data loading and batch generation
   - ✅ Training with validation
   - ✅ Model evaluation and metrics
   - ✅ Training visualization
   - ✅ Model saving with metadata

### In Progress
- 🔄 Inference pipeline implementation
- 🔄 Canvas component implementation
- 🔄 Real-time communication setup

### Coming Soon
- ⏳ API endpoints for recognition
- ⏳ User authentication
- ⏳ Game mode implementation
- ⏳ Full integration of all components

## Training Results

The model training pipeline supports three different CNN architectures:

1. **Simple CNN**: 93-95% accuracy on the test set
   - Fast training time (~15 minutes on CPU)
   - Model size: ~5MB
   - Good for quick iterations and testing

2. **Advanced CNN**: 96-97% accuracy on the test set
   - Moderate training time (~30 minutes on CPU)
   - Model size: ~15MB
   - Recommended for production use

3. **MobileNetV2**: 95-98% accuracy on the test set
   - Longer training time (~45 minutes on CPU)
   - Model size: ~9MB (after optimization)
   - Best accuracy, especially with limited training data

Training metrics are automatically visualized and saved:
- Accuracy and loss curves
- Confusion matrix
- Example predictions

## Data Management

The project uses the Google Quick Draw dataset:

- Each category contains thousands of drawings
- We limit to 3000 images per category for efficient training
- The raw data is stored in NDJSON files
- Each drawing contains stroke data (X,Y coordinates)
- Processed data is split into:
  - 70% training set
  - 15% validation set
  - 15% test set

## Model Architectures

Three different CNN architectures are available:

1. **Simple CNN**: Basic architecture with 3 convolutional layers
2. **Advanced CNN**: Deeper architecture with residual connections
3. **MobileNetV2**: Transfer learning based architecture

## Technology Stack

### Frontend
- React, React Router, Context API
- HTML5 Canvas API
- Tailwind CSS, shadcn/ui
- Socket.io-client

### Backend
- Node.js, Express.js
- Socket.io
- MongoDB, Mongoose
- JWT Authentication

### AI Service
- Flask
- TensorFlow/ONNX Runtime
- NumPy, Pandas, Matplotlib
- OpenCV for image processing
- Quick, Draw! Dataset

## Troubleshooting

### Common Issues

**Virtual Environment Activation**
- Use `venv\Scripts\activate` on Windows
- Use `source venv/bin/activate` on macOS/Linux

**TensorFlow Installation**
- If installation fails, try `pip install tensorflow-cpu==2.7.0`
- Alternative: Use ONNX Runtime as specified in the requirements.txt

**Dataset Download**
- Ensure you have sufficient disk space (~3MB per category with 3000 image limit)
- If download fails, try with fewer categories first

**Dataset Processing**
- If you encounter memory issues, reduce the --max-samples parameter
- Use --visualize to generate example visualizations or --no-visualize to disable them

**Model Training**
- For memory issues, reduce batch size (--batch-size 32 or lower)
- For faster testing, use --max-per-class to limit the dataset size
- If you have a GPU, ensure TensorFlow can detect it
- If training is unstable, reduce learning rate with --learning-rate 0.0005

## License

[MIT](LICENSE)
