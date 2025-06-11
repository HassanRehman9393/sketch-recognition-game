# 🎨 Quick Doodle: AI-Powered Sketch Recognition Game

<div align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/TensorFlow-FF6F00?logo=tensorflow&logoColor=white" alt="TensorFlow">
  <img src="https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white" alt="Socket.io">
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" alt="MongoDB">
</div>

<br>

A modern, real-time collaborative sketching platform that brings AI-powered sketch recognition to the classic game of Pictionary. Draw with friends while an intelligent AI system recognizes your sketches in real-time, making every game fair, fast, and fun!

## ✨ Key Features

### 🎯 **AI-Powered Recognition**
- **Smart Detection**: Advanced MobileNetV2-based neural network recognizes 14 different object categories
- **Real-time Inference**: Lightning-fast recognition with 15ms average response time
- **Confidence Scoring**: Multiple prediction candidates with confidence levels for fair gameplay

### 🎨 **Collaborative Drawing**
- **Multi-user Canvas**: Draw together in real-time with up to 8 players
- **Rich Drawing Tools**: Multiple colors, brush sizes, and drawing modes
- **Live Cursors**: See where other players are drawing in real-time
- **Undo/Redo**: Full drawing history with seamless undo/redo functionality

### 🎮 **Game Modes**
- **Classic Pictionary**: Traditional turn-based drawing game with AI as the judge
- **Speed Drawing**: Race against time to get the AI to recognize your sketches
- **Collaborative Mode**: Work together to create drawings the AI can recognize

### 🚀 **Modern Architecture**
- **Real-time Communication**: WebSocket-powered instant updates using Socket.io
- **Responsive Design**: Beautiful, mobile-friendly interface built with React and Tailwind CSS
- **Scalable Backend**: Node.js/Express server with MongoDB for persistent data
- **AI Microservice**: Dedicated Python Flask service for machine learning inference

## 🎯 Supported Categories

The AI can recognize 14 different object categories:
`airplane` • `apple` • `bicycle` • `car` • `cat` • `chair` • `clock` • `dog` • `face` • `fish` • `house` • `star` • `tree` • `umbrella`

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Node.js Server │◄──►│  Python AI API  │
│                 │    │                 │    │                 │
│ • Canvas API    │    │ • Express.js    │    │ • Flask         │
│ • Socket.io     │    │ • Socket.io     │    │ • TensorFlow    │
│ • Tailwind CSS  │    │ • JWT Auth      │    │ • MobileNetV2   │
│ • React Router  │    │ • MongoDB       │    │ • OpenCV        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or higher)
- **Python** (3.8-3.10 recommended)
- **MongoDB** (local or cloud instance)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sketch-recognition-game.git
cd sketch-recognition-game
```

### 2. Set Up the Frontend

```bash
cd client
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

### 3. Set Up the Backend

```bash
cd server
npm install
npm run dev
```
The server will run on `http://localhost:3001`

### 4. Set Up the AI Service

#### Create Python Environment
```bash
cd ai-service

# Windows
python -m venv venv_tf
venv_tf\Scripts\activate

# macOS/Linux
python3 -m venv venv_tf
source venv_tf/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Download & Process Dataset
```bash
# Download the Quick Draw dataset (14 categories, 3000 samples each)
python scripts/download_dataset.py --all

# Process the raw data into training format
python scripts/process_dataset.py --all --visualize
```

#### Train the AI Model
```bash
# Phase 1: Train classification head (10-15 minutes)
python scripts/train_model.py --model-type mobilenet --phase 1 --epochs 10 --batch-size 64 --augmentation

# Phase 2: Fine-tune the model (20-30 minutes)
python scripts/train_model.py --model-type mobilenet --phase 2 --epochs 20 --batch-size 64 --learning-rate 0.0001 --augmentation
```

#### Start the AI Service
```bash
python main.py
```
The AI service will be available at `http://localhost:5002`

## 🎮 How to Play

1. **Create or Join a Room**: Start a new game room or join an existing one with friends
2. **Choose Your Word**: Select from AI-suggested words or pick your own drawing challenge
3. **Start Drawing**: Use the canvas tools to sketch your chosen word
4. **AI Recognition**: Watch as the AI tries to guess what you're drawing in real-time
5. **Score Points**: Earn points based on how quickly the AI recognizes your drawing
6. **Take Turns**: Pass the drawing turn to other players and guess their sketches

## 🛠️ Configuration

### Environment Variables

Create `.env` files in each component:

#### Server (.env)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/quickdoodle
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:5002
```

#### AI Service (.env)
```env
MODEL_PATH=app/models/quickdraw/quickdraw_model_mobilenet_phase2_*.h5
PORT=5002
DEBUG=True
```

## 🧠 AI Model Performance

Our sketch recognition system uses a state-of-the-art MobileNetV2-based neural network trained on the Google Quick Draw dataset:

### 📊 Model Statistics
- **Architecture**: MobileNetV2 with Transfer Learning
- **Training Data**: 75,695 hand-drawn sketches across 14 categories
- **Model Accuracy**: 55.22% Top-1, 82.71% Top-3 accuracy
- **Inference Speed**: ~15ms average response time
- **Model Size**: 9MB (optimized for web deployment)

### 🎯 Training Process
- **Phase 1**: Classification head training (65 minutes)
- **Phase 2**: Fine-tuning top layers (159 minutes)
- **Data Augmentation**: Rotation, translation, zoom, and flip transformations
- **Optimization**: Early stopping, learning rate scheduling, and dropout regularization

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Game Management
- `GET /api/rooms` - List available rooms
- `POST /api/rooms` - Create new game room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join a room

### AI Recognition
- `POST /api/recognize` - Submit drawing for AI recognition
- `GET /api/status` - Check AI service health

### WebSocket Events
- `drawing_data` - Real-time drawing synchronization
- `user_joined` - Player joined room
- `game_start` - Game session started
- `recognition_result` - AI recognition results
- `score_update` - Player score updates

## 🚨 Troubleshooting

### Common Issues

#### TensorFlow Installation
```bash
# Windows compatibility fix
pip install tensorflow-cpu==2.10.0 protobuf==3.19.6

# Flask compatibility
pip install flask==2.0.3 werkzeug==2.0.3
```

#### Memory Issues During Training
```bash
# Reduce batch size
python scripts/train_model.py --batch-size 32

# Limit dataset size
python scripts/train_model.py --max-per-class 1000
```

#### MongoDB Connection
```bash
# Check MongoDB service status
mongod --version

# Start MongoDB service (Windows)
net start MongoDB

# Start MongoDB service (macOS/Linux)
brew services start mongodb-community
```

#### Port Conflicts
- Frontend (React): Default port 5173
- Backend (Node.js): Default port 3001  
- AI Service (Python): Default port 5002
- MongoDB: Default port 27017

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all services start correctly

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Quick Draw Dataset** - For providing the training data
- **TensorFlow Team** - For the machine learning framework
- **React Community** - For the excellent frontend framework
- **Socket.io Team** - For real-time communication capabilities

---

<div align="center">
  <strong>Built with ❤️ for AI enthusiasts and game lovers</strong>
  <br>
  <sub>Made possible by modern web technologies and machine learning</sub>
</div>