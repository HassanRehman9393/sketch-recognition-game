# Sketch Recognition AI Service

This document provides an overview of the AI service for the sketch recognition game, including the data processing, model architecture, training process, and results.

## Project Overview

We've built a sketch recognition system using the Quick Draw dataset, focusing on 5 categories: airplane, apple, bicycle, cat, and house. The system uses a MobileNetV2-based neural network with transfer learning to classify hand-drawn sketches.

## Implementation Timeline

1. **Environment Setup** - Configured Python virtual environment with TensorFlow and all necessary dependencies.
2. **Dataset Processing** - Downloaded and processed 5,000 sketches per category (25,000 total) from the Quick Draw dataset.
3. **Model Architecture** - Implemented a MobileNetV2-based transfer learning model.
4. **Phase 1 Training** - Trained the model's classification layers while keeping the base MobileNetV2 frozen.
5. **Next: Phase 2 Training** - Fine-tuning of the model's top layers will be the next step.

## Data Processing

We processed the raw NDJSON stroke data from the Quick Draw dataset into normalized 28x28 pixel grayscale images suitable for training:

1. Downloaded raw sketches for 5 categories (5,000 samples each)
2. Rendered stroke data to images with proper padding and scaling
3. Normalized images to match MobileNetV2's input requirements
4. Split into training (70%), validation (15%), and test (15%) sets

Dataset statistics:

Categories: airplane, apple, bicycle, cat, house
Training samples: 17,500 (3,500 per category)
Validation samples: 3,750 (750 per category)
Test samples: 3,750 (750 per category)


## Model Architecture

Our model employs transfer learning with MobileNetV2:

1. Input Layer (28×28×1 grayscale images)
2. Channel Expansion (28×28×3, replicating the single channel)
3. Resizing (96×96×3, adapting to MobileNetV2's expected input)
4. MobileNetV2 Base (pre-trained on ImageNet, feature extraction)
5. Custom Classification Head:
   - Dropout (0.2)
   - Dense Layer (256 neurons with ReLU)
   - Batch Normalization
   - Dropout (0.5)
   - Output Layer (5 neurons with softmax)

The two-phase training approach separates the training of the classification head (Phase 1) from the fine-tuning of the network (Phase 2).

## Training Results

### Phase 1 Results: Training the Classification Head

The Phase 1 training focused on the classification head while keeping the MobileNetV2 base frozen:

Training Parameters:

Epochs: 10
Batch Size: 64
Learning Rate: 0.001 (reduced to 0.0002 via ReduceLROnPlateau)
Data Augmentation: Enabled (rotation ±10°, shifts ±10%, zoom ±10%)
Training Time: 1,622.73 seconds (~27 minutes)



#### Phase 1 Performance Metrics:

- **Test Accuracy**: 46.03% (Top-1)
- **Test Top-3 Accuracy**: 92.85%
- **Test Loss**: 1.1183

The model's performance is promising for Phase 1, with nearly half of all sketches correctly classified as their first choice, and over 90% having the correct category among the top 3 predictions.

### Phase 2 Results: Fine-tuning the Model

In Phase 2, we unfroze the top 50 layers of the MobileNetV2 base model and fine-tuned them with a lower learning rate:

Training Parameters:

Epochs: 20
Batch Size: 64
Learning Rate: 0.0001
Data Augmentation: Enabled
Training Time: 3,851.67 seconds (~64 minutes)


#### Phase 2 Performance Metrics:

- **Test Accuracy**: 70.48% (Top-1)
- **Test Top-3 Accuracy**: 96.00%
- **Test Loss**: 0.8411

#### Training Progress:

The validation accuracy improved significantly during Phase 2, from 20.00% at the beginning to 70.21% by the end of training. The model's performance steadily improved throughout the 20 epochs, with the most dramatic improvements occurring between epochs 10 and 17.

### Performance Improvement

Fine-tuning in Phase 2 delivered substantial improvements over Phase 1:
- **Top-1 Accuracy**: +24.45% (from 46.03% to 70.48%)
- **Top-3 Accuracy**: +3.15% (from 92.85% to 96.00%)
- **Loss Reduction**: -0.2772 (from 1.1183 to 0.8411)

These results confirm that the two-phase transfer learning approach was highly effective, with Phase 2 fine-tuning significantly enhancing the model's ability to recognize sketches across the five categories.

## Model Analysis

The final model achieves over 70% accuracy in correctly identifying hand-drawn sketches from five different categories (airplane, apple, bicycle, cat, and house). This is an excellent result considering:

1. The inherent variability in how people draw the same object
2. The simplified 28x28 pixel representation used for training
3. The limited dataset size (5,000 samples per category)
4. The challenge of distinguishing between visually similar categories

The high Top-3 accuracy (96%) indicates that even when the model's top prediction is incorrect, the correct category is almost always among the top three predictions.

## Next Steps

1. **API Integration** - Complete the Flask API service for real-time sketch recognition using the trained model.

2. **Frontend Integration** - Connect the AI service to the game's frontend for real-time sketch recognition during gameplay.

3. **Model Optimization** - Convert the model to TensorFlow Lite format for more efficient deployment:
   ```bash
   python scripts/train_model.py --model-type mobilenet --convert-tflite --quantize
   ```
4. Expand Categories - Consider training on additional categories to expand the game's vocabulary.

### Training Progress:

During Phase 1 training, the model's validation accuracy peaked at 48.45% in epoch 3. Learning rate reduction was triggered after epoch 8 when performance plateaued.

## Next Steps

1. **Phase 2 Training** - Fine-tune the model by unfreezing the top layers of MobileNetV2:
   ```bash
   python scripts/train_model.py --model-type mobilenet --phase 2 --learning-rate 0.0001 --augmentation
   ``` 

2. Performance Evaluation - Generate confusion matrix and classification report to analyze model performance in detail:

```bash
python scripts/train_model.py --model-type mobilenet --phase 2 --confusion-matrix --learning-rate 0.0001
```

3. Model Optimization - Convert to TensorFlow Lite and quantize the model for efficient deployment:

```bash
python scripts/train_model.py --model-type mobilenet --phase 2 --convert-tflite --quantize --learning-rate 0.0001
```

4. API Integration - Complete the Flask API service for real-time sketch recognition. 

Files and Directory Structure

ai-service/
├── app/
│   ├── core/                 # Core ML functionality
│   │   ├── data_loader.py    # Dataset downloading
│   │   ├── data_processor.py # Dataset processing
│   │   └── model_builder.py  # Neural network architecture
│   ├── models/               # Trained model storage
│   │   └── quickdraw/        # QuickDraw model files (.h5, .json)
│   └── utils/                # Utility functions
│       ├── model_utils.py    # Model saving/loading utilities
│       └── visualization.py  # Plotting and visualization tools
├── data/                     # Dataset storage
│   ├── raw/                  # Raw NDJSON files
│   └── processed/            # Processed images (28x28)
├── docs/                     # Documentation
│   ├── README.md             # This overview document
│   └── SETUP.md              # Setup instructions
├── notebooks/                # Jupyter notebooks
│   └── model_training.ipynb  # Interactive training notebook
├── scripts/                  # Command-line scripts
│   ├── download_dataset.py   # Dataset download script
│   ├── process_dataset.py    # Dataset processing script
│   └── train_model.py        # Model training script
└── requirements.txt          # Python dependencies


Conclusion
The Phase 1 training results demonstrate that our MobileNetV2-based model is learning effectively from the sketch dataset. The high Top-3 accuracy (92.85%) suggests that the model is capturing relevant features, and fine-tuning in Phase 2 should further improve the Top-1 accuracy.

The modular architecture we've implemented allows for easy experimentation with different model configurations and hyperparameters. Once Phase 2 training is complete, we'll be ready to integrate the model into the sketch recognition game's API service.