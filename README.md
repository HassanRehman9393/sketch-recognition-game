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
- Python (v3.8 or higher)
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

```bash
cd ai-service
# Create and activate virtual environment
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
python main.py
```

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
- TensorFlow
- NumPy
- Quick, Draw! Dataset

## License

[MIT](LICENSE)
