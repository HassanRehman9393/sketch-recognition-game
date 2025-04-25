import matplotlib.pyplot as plt
import numpy as np
import itertools
import os
import tensorflow as tf
from sklearn.metrics import confusion_matrix
import logging

logger = logging.getLogger('visualization')

def plot_confusion_matrix(cm, class_names, title='Confusion Matrix', cmap=plt.cm.Blues, normalize=False):
    """
    Plot confusion matrix
    
    Args:
        cm (numpy.ndarray): Confusion matrix
        class_names (list): List of class names
        title (str): Plot title
        cmap: Colormap
        normalize (bool): Whether to normalize the confusion matrix
    
    Returns:
        matplotlib.figure.Figure: Figure object
    """
    if normalize:
        cm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
        
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=cmap)
    plt.title(title)
    plt.colorbar()
    
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)
    
    fmt = '.2f' if normalize else 'd'
    thresh = cm.max() / 2.
    for i, j in itertools.product(range(cm.shape[0]), range(cm.shape[1])):
        plt.text(j, i, format(cm[i, j], fmt),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black")
    
    plt.tight_layout()
    plt.ylabel('True label')
    plt.xlabel('Predicted label')
    
    return plt.gcf()

def plot_training_history(history, save_path=None):
    """
    Plot training history
    
    Args:
        history (dict): Training history
        save_path (str, optional): Path to save the plot
    
    Returns:
        tuple: Figure and axes objects
    """
    # Create figure with two subplots
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
    
    # Plot training & validation accuracy
    ax1.plot(history['accuracy'])
    ax1.plot(history['val_accuracy'])
    ax1.set_title('Model Accuracy')
    ax1.set_ylabel('Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.legend(['Train', 'Validation'], loc='upper left')
    ax1.grid(True)
    
    # Plot training & validation loss
    ax2.plot(history['loss'])
    ax2.plot(history['val_loss'])
    ax2.set_title('Model Loss')
    ax2.set_ylabel('Loss')
    ax2.set_xlabel('Epoch')
    ax2.legend(['Train', 'Validation'], loc='upper right')
    ax2.grid(True)
    
    plt.tight_layout()
    
    # Save the plot if a path is provided
    if save_path:
        plt.savefig(save_path)
        logger.info(f"Training history plot saved to {save_path}")
    
    return fig, (ax1, ax2)

def visualize_model_predictions(model, images, true_labels, class_names, num_images=10):
    """
    Visualize model predictions on sample images
    
    Args:
        model: Trained model
        images: Input images
        true_labels: True labels (one-hot encoded)
        class_names: List of class names
        num_images: Number of images to visualize
        
    Returns:
        matplotlib.figure.Figure: Figure object
    """
    # Convert one-hot encoded labels to class indices
    if len(true_labels.shape) > 1 and true_labels.shape[1] > 1:
        true_labels = np.argmax(true_labels, axis=1)
        
    # Select random indices
    if len(images) > num_images:
        indices = np.random.choice(len(images), num_images, replace=False)
    else:
        indices = range(len(images))
        
    # Get predictions
    predictions = model.predict(images[indices])
    pred_labels = np.argmax(predictions, axis=1)
    
    # Create figure
    fig = plt.figure(figsize=(15, 2 * num_images))
    
    for i, idx in enumerate(indices):
        # Display original image
        ax = fig.add_subplot(num_images, 2, i*2 + 1)
        
        # Handle different image formats (grayscale vs RGB)
        if len(images[idx].shape) == 2:
            plt.imshow(images[idx], cmap='gray')
        elif images[idx].shape[-1] == 1:
            plt.imshow(images[idx].reshape(images[idx].shape[0], images[idx].shape[1]), cmap='gray')
        else:
            plt.imshow(images[idx])
            
        ax.set_title(f"True: {class_names[true_labels[idx]]}")
        plt.axis('off')
        
        # Display prediction details
        ax = fig.add_subplot(num_images, 2, i*2 + 2)
        
        # Get top 3 predictions
        top_indices = predictions[i].argsort()[-3:][::-1]
        top_values = predictions[i][top_indices]
        
        y_pos = np.arange(len(top_indices))
        ax.barh(y_pos, top_values)
        ax.set_yticks(y_pos)
        ax.set_yticklabels([class_names[idx] for idx in top_indices])
        ax.invert_yaxis()
        ax.set_title(f"Prediction: {class_names[pred_labels[i]]}")
        
    plt.tight_layout()
    return fig

def visualize_feature_maps(model, image, layer_name, max_features=16):
    """
    Visualize feature maps from a specific layer for a given input image.
    
    Args:
        model: Trained model
        image: Input image (should match model's input shape)
        layer_name: Name of the layer to visualize
        max_features: Maximum number of feature maps to display
    """
    # Create a model that will output the feature maps
    feature_model = tf.keras.Model(inputs=model.input, 
                                 outputs=model.get_layer(layer_name).output)
    
    # Expand dimensions if needed
    if len(image.shape) == 3:
        image = np.expand_dims(image, axis=0)
    
    # Get feature maps
    feature_maps = feature_model.predict(image)
    
    # Determine grid size for plotting
    n_features = min(max_features, feature_maps.shape[-1])
    grid_size = int(np.ceil(np.sqrt(n_features)))
    
    # Create figure
    fig, axes = plt.subplots(grid_size, grid_size, figsize=(12, 12))
    axes = axes.flatten()
    
    # Plot each feature map
    for i in range(n_features):
        feature_map = feature_maps[0, :, :, i]
        axes[i].imshow(feature_map, cmap='viridis')
        axes[i].set_title(f'Feature {i+1}')
        axes[i].axis('off')
    
    # Hide unused subplots
    for i in range(n_features, grid_size*grid_size):
        axes[i].axis('off')
    
    plt.suptitle(f'Feature Maps from layer: {layer_name}')
    plt.tight_layout()
    plt.subplots_adjust(top=0.9)
    
    return fig, axes
