# Sketch Recognition AI Service

This document provides an overview of the AI service for the sketch recognition game, including the data processing, model architecture, training process, and results.

---

## 📊 Project Overview

We've built a sketch recognition system using the Quick Draw dataset, focusing on 5 categories: airplane, apple, bicycle, cat, and house. The system uses a MobileNetV2-based neural network with transfer learning to classify hand-drawn sketches.

---

## ⏳ Implementation Timeline

1. **Environment Setup** - Configured Python virtual environment with TensorFlow and all necessary dependencies.
2. **Dataset Processing** - Downloaded and processed 5,000 sketches per category (25,000 total).
3. **Model Architecture** - Implemented a MobileNetV2-based transfer learning model.
4. **Phase 1 Training** - Trained classification layers with base frozen.
5. **Phase 2 Training** - Fine-tuned top layers of the MobileNetV2 base.

---

## 📁 Data Processing

Steps:
1. Downloaded raw sketches for 5 categories (5,000 samples each).
2. Rendered stroke data to images with proper padding and scaling.
3. Normalized images to match MobileNetV2 input requirements.
4. Split data into training (70%), validation (15%), and test (15%) sets.

**Dataset Statistics:**
- Categories: airplane, apple, bicycle, cat, house
- Training samples: 17,500 (3,500 per category)
- Validation samples: 3,750 (750 per category)
- Test samples: 3,750 (750 per category)

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
   - Output Layer (5, softmax)

**Training Strategy:**
- Phase 1: Train only the classification head.
- Phase 2: Fine-tune top 50 layers of MobileNetV2.

---

## 🏆 Training Results

### Phase 1: Training Classification Head
- **Epochs**: 10
- **Batch Size**: 64
- **Learning Rate**: 0.001 (reduced to 0.0002)
- **Data Augmentation**: Enabled
- **Training Time**: ~27 minutes

#### Metrics:
- Top-1 Accuracy: 46.03%
- Top-3 Accuracy: 92.85%
- Loss: 1.1183

### Phase 2: Fine-tuning the Model
- **Epochs**: 20
- **Batch Size**: 64
- **Learning Rate**: 0.0001
- **Data Augmentation**: Enabled
- **Training Time**: ~64 minutes

#### Metrics:
- Top-1 Accuracy: 70.48%
- Top-3 Accuracy: 96.00%
- Loss: 0.8411

#### Accuracy Progress:
- Validation accuracy improved from 20.00% to 70.21% across 20 epochs.

#### Improvement Summary:
- Top-1 Accuracy: +24.45%
- Top-3 Accuracy: +3.15%
- Loss Reduction: -0.2772

---

## 🔍 Model Analysis

The final model achieves:
- **70.48%** Top-1 accuracy
- **96.00%** Top-3 accuracy

### Considerations:
- High variability in sketching styles
- Limited 28x28 pixel resolution
- Small dataset (5,000 per category)
- Similar-looking objects

Despite this, the model shows strong generalization and robustness.

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

