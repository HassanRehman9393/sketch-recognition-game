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

## Development Progress

### Completed
- ✅ Project structure setup and configuration
- ✅ Environment setup for client, server, and AI service
- ✅ Basic Flask API setup for the AI service
- ✅ Dataset download functionality with customizable category selection
- ✅ Download script with built-in limitations (3000 images per category)
- ✅ Image processing utilities for sketch normalization
- ✅ Data backup functionality for downloaded categories

### In Progress
- 🔄 Processing raw dataset into training format
- 🔄 Canvas component implementation
- 🔄 Real-time communication setup

### Coming Soon
- ⏳ Model training with the Quick Draw dataset
- ⏳ User authentication
- ⏳ Game mode implementation
- ⏳ Full integration of all components

## Data Management

The project uses the Google Quick Draw dataset:

- Each category contains thousands of drawings
- We limit to 3000 images per category for efficient training
- The raw data is stored in NDJSON files
- Each drawing contains stroke data (X,Y coordinates)

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
- NumPy, Pandas
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

## License

[MIT](LICENSE)
