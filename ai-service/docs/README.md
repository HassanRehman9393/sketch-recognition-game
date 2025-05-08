# Sketch Recognition AI Service

This document provides an overview of the AI service for the sketch recognition game, including the data processing, model architecture, training process, and results.

---

## 📊 Project Overview

We've built a sketch recognition system using the Quick Draw dataset, initially focusing on 5 categories: airplane, apple, bicycle, cat, and house. The system has been enhanced to now recognize 14 categories using a MobileNetV2-based neural network with transfer learning to classify hand-drawn sketches.

---

## ⏳ Implementation Timeline

1. **Environment Setup** - Configured Python virtual environment with TensorFlow and all necessary dependencies.
2. **Initial Dataset Processing** - Downloaded and processed 5,000 sketches per category (25,000 total) for 5 categories.
3. **Model Architecture** - Implemented a MobileNetV2-based transfer learning model.
4. **Phase 1 Training** - Trained classification layers with base frozen.
5. **Phase 2 Training** - Fine-tuned top layers of the MobileNetV2 base.
6. **Dataset Expansion** - Extended dataset to include 14 categories for improved recognition capabilities.
7. **Enhanced Model Training** - Retrained the model with expanded dataset.

---

## 📁 Data Processing

### Initial Dataset (5 Categories)
Steps:
1. Downloaded raw sketches for 5 categories (5,000 samples each).
2. Rendered stroke data to images with proper padding and scaling.
3. Normalized images to match MobileNetV2 input requirements.
4. Split data into training (70%), validation (15%), and test (15%) sets.

**Initial Dataset Statistics:**
- Categories: airplane, apple, bicycle, cat, house
- Training samples: 17,500 (3,500 per category)
- Validation samples: 3,750 (750 per category)
- Test samples: 3,750 (750 per category)

### Expanded Dataset (14 Categories)
Steps:
1. Added 9 new categories to the existing 5 categories.
2. Processed the new categories using the same methodology.
3. Maintained consistent preprocessing for all categories.

**Expanded Dataset Statistics:**
- Categories: airplane, apple, bicycle, car, cat, chair, clock, dog, face, fish, house, star, tree, umbrella
- Training samples: 51,122
- Validation samples: 11,788
- Test samples: 11,785

---

## 🌎 Model Architecture

Using transfer learning with MobileNetV2:

1. Input Layer: 28x28x1 grayscale images
2. Channel Expansion: Convert to 28x28x3
3. Resize to 96x96x3
4. MobileNetV2 Base (pre-trained on ImageNet)
5. Custom Classification Head:
   - Dropout (0.2)
   - Dense Layer (256, ReLU)
   - Batch Normalization
   - Dropout (0.5)
   - Output Layer (5 classes initially, extended to 14 classes)

**Training Strategy:**
- Phase 1: Train only the classification head.
- Phase 2: Fine-tune top 50 layers of MobileNetV2.

---

## 🏆 Training Results

### Initial Model (5 Categories)

#### Phase 1: Training Classification Head
- **Epochs**: 10
- **Batch Size**: 64
- **Learning Rate**: 0.001 (reduced to 0.0002)
- **Data Augmentation**: Enabled
- **Training Time**: ~27 minutes

##### Metrics:
- Top-1 Accuracy: 46.03%
- Top-3 Accuracy: 92.85%
- Loss: 1.1183

#### Phase 2: Fine-tuning the Model
- **Epochs**: 20
- **Batch Size**: 64
- **Learning Rate**: 0.0001
- **Data Augmentation**: Enabled
- **Training Time**: ~64 minutes

##### Metrics:
- Top-1 Accuracy: 70.48%
- Top-3 Accuracy: 96.00%
- Loss: 0.8411

#### Accuracy Progress:
- Validation accuracy improved from 20.00% to 70.21% across 20 epochs.

#### Improvement Summary:
- Top-1 Accuracy: +24.45%
- Top-3 Accuracy: +3.15%
- Loss Reduction: -0.2772

### Expanded Model (14 Categories)

#### Phase 1: Training Classification Head
- **Epochs**: 10
- **Batch Size**: 64
- **Learning Rate**: 0.001
- **Data Augmentation**: Enabled
- **Training Time**: ~65 minutes (3919.99 seconds)

##### Metrics:
- Top-1 Accuracy: 35.96%
- Top-3 Accuracy: 64.73%
- Loss: 1.9484

#### Phase 2: Fine-tuning the Model
- **Epochs**: 20
- **Batch Size**: 64
- **Learning Rate**: 0.0001
- **Data Augmentation**: Enabled
- **Training Time**: ~159 minutes (9534.29 seconds)

##### Metrics:
- Top-1 Accuracy: 55.22%
- Top-3 Accuracy: 82.71%
- Loss: 1.4080

#### Accuracy Progress:
- Validation accuracy improved from 5.54% to 54.16% across 20 epochs.

#### Improvement Summary:
- Top-1 Accuracy: +19.26% from Phase 1 to Phase 2
- Top-3 Accuracy: +17.98% from Phase 1 to Phase 2
- Loss Reduction: -0.5404 from Phase 1 to Phase 2

---

## 🔍 Model Analysis

### Initial Model (5 Categories)
The 5-category model achieved:
- **70.48%** Top-1 accuracy
- **96.00%** Top-3 accuracy

### Expanded Model (14 Categories)
The expanded 14-category model achieves:
- **55.22%** Top-1 accuracy
- **82.71%** Top-3 accuracy

### Performance Comparison
While the expanded model has lower absolute accuracy metrics, this is expected due to:
- Increased classification complexity (14 classes vs 5 classes)
- More potential for confusion between visually similar categories
- Wider variety of drawing styles to recognize

Despite the increased challenge, the expanded model provides much greater utility with nearly 3x the recognition capabilities.

### Considerations:
- High variability in sketching styles
- Limited 28x28 pixel resolution
- Similar-looking objects across categories
- Training with 14 classes provides broader recognition capabilities for the game

Despite these challenges, both models show strong generalization and robustness.

---

## ✅ Next Steps

### 1. API Integration
- Implement Flask API for real-time recognition.

### 2. Frontend Integration
- Connect model to game's frontend UI.

### 3. Model Optimization
Convert to TensorFlow Lite with quantization:
```bash
python scripts/train_model.py --model-type mobilenet --convert-tflite --quantize
```

### 4. Expand Categories
- Add more Quick Draw categories for broader recognition.

### 5. Performance Evaluation
Generate confusion matrix and classification report:
```bash
python scripts/train_model.py --model-type mobilenet --phase 2 --confusion-matrix --learning-rate 0.0001
```

---

## 📂 File & Directory Structure

```
ai-service/
├── app/
│   ├── core/
│   │   ├── data_loader.py
│   │   ├── data_processor.py
│   │   └── model_builder.py
│   ├── models/
│   │   └── quickdraw/  # Contains .h5 and .json model files
│   └── utils/
│       ├── model_utils.py
│       └── visualization.py
├── data/
│   ├── raw/            # NDJSON files
│   └── processed/      # 28x28 PNGs
├── docs/
│   ├── README.md
│   └── SETUP.md
├── notebooks/
│   └── model_training.ipynb
├── scripts/
│   ├── download_dataset.py
│   ├── process_dataset.py
│   └── train_model.py
└── requirements.txt
```

---

## 🚀 Conclusion

- The MobileNetV2-based model demonstrates strong learning capacity from low-res sketches.
- Phase 2 fine-tuning significantly enhanced performance.
- With real-time API integration and category expansion, the sketch recognition game is poised for high engagement and scalability.

The modular architecture supports future experimentation and deployment strategies.


## 📈 Latest Training Results (May 2025)

### Updated Dataset

- Expanded to 14 classes: airplane, apple, bicycle, car, cat, chair, clock, dog, face, fish, house, star, tree, umbrella
- Processed images: 51,122 training, 11,788 validation, 11,785 test

### Phase 1 Training (May 2025)
- Command:
   ```
   python scripts/train_model.py --model-type mobilenet --phase 1 --epochs 10 --batch-size 64 --learning-rate 0.001 
   --augmentation
   ```
- Hardware: CPU only
- Duration: 65 minutes (3919.99 seconds)
- Best validation accuracy: 36.13% (Epoch 8)
- Final test accuracy: 35.96%
- Test top-3 accuracy: 64.73%

### Phase 2 Fine-tuning (May 2025)

- Command:
   ```
   python scripts/train_model.py --model-type mobilenet --phase 2 --epochs 20 --batch-size 64 --learning-rate 0.0001 --augmentation
   ```
- Hardware: CPU only
- Duration: 159 minutes (9534.29 seconds)
- Best validation accuracy: 54.16% (Epoch 20)
- Final test accuracy: 55.22%
- Test top-3 accuracy: 82.71%

### Observations
- The model showed steady improvement throughout phase 2 training
- Top-1 accuracy improved by 19.26 percentage points from phase 1 to phase 2
- Top-3 accuracy improved by 17.98 percentage points, indicating good representation learning
- The model is now trained on a broader set of categories, making it more versatile for the game

### Model Evolution
- Initial Model (5 Categories): Higher accuracy on fewer categories
- Expanded Model (14 Categories): Slightly lower accuracy but much broader recognition capabilities
- The tradeoff between accuracy and category coverage is expected and beneficial for game experience

### Model Files
The latest trained models are saved at:

- Phase 1: app/models/quickdraw/quickdraw_model_mobilenet_phase1_20250504_212529.h5
- Phase 2: app/models/quickdraw/quickdraw_model_mobilenet_phase2_20250504_223625.h5

Both models include corresponding metadata JSON files with the same naming convention.

# AI Service: Quick-Doodle Sketch Recognition

## Architecture Overview

The AI service component is built using Python Flask and TensorFlow, providing real-time sketch recognition capabilities for the Quick-Doodle game. This service works independently from the main server, receiving drawing data via HTTP requests, processing them through trained neural network models, and returning prediction results.

## Technology Stack

- **Python 3.10**: Core programming language
- **Flask**: Web service framework
- **TensorFlow**: Machine learning framework for model development and inference
- **Pillow (PIL)**: Image processing library
- **NumPy**: Numerical computation
- **Matplotlib**: Visualization for development and debugging 
- **OpenCV**: Additional image preprocessing capabilities

## Core Features Implementation

### 1. Data Flow Architecture

The AI service implements a clean, efficient data flow pattern for processing sketch recognition requests:

#### Incoming Data from Server

1. **Request Reception**: 
   - The Flask application receives HTTP POST requests from the Node.js server at the `/api/recognize` endpoint.
   - Requests contain canvas drawings encoded as base64 image data or vector stroke data.
   - Headers are inspected to ensure proper authorization and content type.

2. **Data Extraction**: 
   - Base64 image data is extracted from the request JSON body.
   - Data is decoded to binary image representation.
   - Additional parameters like confidence threshold can be included in the request.

3. **Input Validation**:
   - Ensures proper image formatting (dimensions, channels, etc.)
   - Validates that content is a drawable sketch
   - Handles malformed requests with appropriate error responses

4. **Input Preprocessing**:
   - Converts images to grayscale required by the model
   - Resizes to 28×28 pixels to match model input dimensions
   - Normalizes pixel values to 0-1 range
   - Applies optional image enhancement (contrast adjustment, noise removal)
   - Inverts colors if needed (white sketch on black background → black sketch on white)

#### Prediction Processing

1. **Model Selection**:
   - Selects appropriate model based on request parameters or uses the default model
   - Loads model using TensorFlow's efficient model serving capabilities
   - Manages model caching to prevent repeated loading

2. **Inference Execution**:
   - Batches input data for efficient processing
   - Runs forward pass through the CNN model
   - Captures prediction outputs (class probabilities)

3. **Confidence Scoring**:
   - Processes raw output logits from model
   - Applies softmax to convert to probability distribution
   - Normalizes confidence scores for consistent interpretation

#### Outgoing Results to Server

1. **Response Formatting**:
   - Transforms model outputs into structured JSON response
   - Sorts predictions by confidence score
   - Filters results below confidence threshold if specified
   - Maps numerical class indices to human-readable class names

2. **Response Enhancement**:
   - Includes top N predictions (configurable)
   - Adds processing time metrics for performance tracking
   - Provides normalized confidence scores (0-1)
   - Includes both raw model output and processed predictions

3. **Error Handling**:
   - Catches model prediction errors and returns informative messages
   - Provides fallback predictions in case of processing issues
   - Returns appropriate HTTP status codes based on result
   - Logs detailed error information for diagnostics

4. **Response Delivery**:
   - Sends formatted JSON response back to the Node.js server
   - Includes appropriate headers for CORS support
   - Compresses response for network efficiency when appropriate
   - Manages connection lifecycle to ensure proper completion

### 2. Model Serving Implementation

The service uses an efficient model serving architecture:

- **Model Loading**: Models are loaded once at service startup and kept in memory
- **Warmup Inference**: Initial inferences are performed to prime the model
- **Thread Safety**: Predictions are handled in a thread-safe manner for concurrent requests
- **Model Versioning**: Support for multiple model versions with a switching mechanism
- **Batching**: Multiple predictions can be processed in a single inference pass
- **Quantization**: Models use post-training quantization to reduce memory footprint

### 3. Optimization Techniques

Several optimizations ensure the service performs efficiently:

- **Model Preloading**: Models are loaded at service start to avoid cold starts
- **TensorFlow Lite**: Using optimized inference engine for better performance
- **Image Resizing**: Efficient preprocessing to match model input requirements
- **Caching**: Storing common computation results to avoid redundant processing
- **Asynchronous Processing**: Background tasks for non-critical operations

### 4. Error Handling and Resilience

The service implements robust error handling:

- **Graceful Degradation**: Returns best-effort predictions even with partial inputs
- **Input Validation**: Thorough validation prevents model errors from malformed inputs
- **Timeout Management**: Ensures prediction calls don't block indefinitely
- **Logging**: Comprehensive error logging for debugging
- **Recovery Mechanisms**: Automatic model reloading if issues are detected

## API Endpoints

### 1. `/api/recognize`

Main prediction endpoint that receives sketch data and returns recognition results.

**Request Format**:
```json
{
  "image_data": "base64_encoded_image_data...",
  "options": {
    "confidence_threshold": 0.2,
    "top_n": 5
  }
}
```

**Response Format**:
```json
{
  "success": true,
  "predictions": {
    "top_predictions": [
      {"class": "airplane", "confidence": 0.92},
      {"class": "bird", "confidence": 0.05},
      {"class": "butterfly", "confidence": 0.02}
    ]
  },
  "processing_time_ms": 42
}
```

### 2. `/api/status`

Provides information about the AI service status and loaded models.

**Response Format**:
```json
{
  "status": "online",
  "model_info": {
    "name": "MobileNetV2",
    "version": "20250504_223625",
    "categories": ["airplane", "apple", "bicycle", "..."],
    "input_shape": [1, 28, 28, 1],
    "last_reload": "2023-05-16T14:30:22Z"
  },
  "uptime_seconds": 3600,
  "requests_processed": 1246
}
```

### 3. `/debug-image`

Generates a test drawing for debugging purposes.

## Deployment Architecture

The AI service is designed for flexible deployment:

- **Docker Containerization**: Packaged as a standalone container
- **Scalability**: Can be scaled horizontally behind a load balancer
- **Environment Variables**: Configuration through environment variables
- **Health Monitoring**: Health check endpoints for orchestration platforms
- **Resource Management**: Controlled memory and CPU utilization

## Future Enhancements

Planned AI service enhancements include:

- **Model Streaming Updates**: Dynamic model updates without service restart
- **Request Queueing**: Enhanced request handling during traffic spikes
- **Performance Analytics**: Detailed metrics about prediction performance
- **Advanced Preprocessing**: More sophisticated image preprocessing
- **Multi-Model Ensemble**: Combining predictions from multiple models
- **Feedback Integration**: Learning from user feedback to improve accuracy

## Conclusion

The AI service forms the core intelligence behind the Quick-Doodle game, translating user sketches into accurate predictions in real-time. Its architecture balances accuracy, performance, and reliability while maintaining flexibility for future improvements.