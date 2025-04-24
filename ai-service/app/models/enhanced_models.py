import tensorflow as tf
from tensorflow.keras import layers, models, regularizers
from tensorflow.keras.applications import MobileNetV2, EfficientNetB0

class EnhancedModelBuilder:
    """Enhanced model architectures for sketch recognition"""
    
    def build_attention_cnn(self, num_classes, input_shape=(28, 28, 1)):
        """
        Build CNN with spatial attention mechanism
        
        Args:
            num_classes (int): Number of output classes
            input_shape (tuple): Input shape of the model
            
        Returns:
            tf.keras.Model: Compiled model
        """
        inputs = layers.Input(shape=input_shape)
        
        # First convolutional block with attention
        x = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(32, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Spatial attention block 1
        attention1 = self._spatial_attention_block(x)
        x = layers.multiply([x, attention1])
        
        # Second convolutional block
        x = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(64, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Spatial attention block 2
        attention2 = self._spatial_attention_block(x)
        x = layers.multiply([x, attention2])
        
        # Third convolutional block
        x = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)
        
        # Flatten and dense layers
        x = layers.Flatten()(x)
        x = layers.Dropout(0.3)(x)
        x = layers.Dense(256, activation='relu', 
                        kernel_regularizer=regularizers.l2(0.001))(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = models.Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def _spatial_attention_block(self, x):
        """
        Create a spatial attention block
        
        Args:
            x: Input tensor
            
        Returns:
            Attention mask
        """
        # Average pooling across channels
        avg_pool = layers.Lambda(lambda x: tf.reduce_mean(x, axis=-1, keepdims=True))(x)
        # Max pooling across channels
        max_pool = layers.Lambda(lambda x: tf.reduce_max(x, axis=-1, keepdims=True))(x)
        
        # Concatenate pooled features
        concat = layers.Concatenate()([avg_pool, max_pool])
        
        # Generate attention mask
        attention = layers.Conv2D(1, kernel_size=(7, 7), padding='same', 
                                activation='sigmoid')(concat)
        
        return attention
    
    def build_efficientnet_model(self, num_classes, input_shape=(28, 28, 1)):
        """
        Build EfficientNet-based model with transfer learning
        
        Args:
            num_classes (int): Number of output classes
            input_shape (tuple): Input shape of the model
            
        Returns:
            tf.keras.Model: Compiled model
        """
        # Create input layer that handles grayscale images
        inputs = layers.Input(shape=input_shape)
        
        # Convert grayscale to RGB by repeating the channel
        if input_shape[-1] == 1:
            x = layers.Lambda(lambda x: tf.repeat(x, 3, axis=-1))(inputs)
        else:
            x = inputs
            
        # Resize to EfficientNet input size
        x = layers.Resizing(96, 96)(x)
        
        # Load pre-trained EfficientNet without top layers
        base_model = EfficientNetB0(
            include_top=False,
            weights='imagenet',
            input_shape=(96, 96, 3)
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Connect EfficientNet
        x = base_model(x, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        
        # Custom top layers
        x = layers.Dense(128, activation='relu')(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.3)(x)
        
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = models.Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model

    def build_mobilenet_model(self, num_classes, input_shape=(28, 28, 1)):
        """
        Build MobileNetV2-based model with transfer learning and special handling for sketches
        
        Args:
            num_classes (int): Number of output classes
            input_shape (tuple): Input shape of the model
            
        Returns:
            tf.keras.Model: Compiled model
        """
        # Create input layer
        inputs = layers.Input(shape=input_shape)
        
        # Convert grayscale to RGB by repeating the channel
        if input_shape[-1] == 1:
            x = layers.Lambda(lambda x: tf.repeat(x, 3, axis=-1))(inputs)
        else:
            x = inputs
            
        # Resize to MobileNet input size (96x96 is smaller than default but works well for sketches)
        x = layers.Resizing(96, 96)(x)
        
        # Improve sketch contrast (important for transfer learning from natural images)
        # This helps emphasize the sketch lines
        x = layers.Lambda(lambda x: tf.clip_by_value(x * 1.2, 0, 1))(x)
        
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(96, 96, 3),
            include_top=False,
            weights='imagenet',
            alpha=0.75  # Smaller model variant for faster inference
        )
        
        # Freeze early layers but allow fine-tuning of later layers
        for layer in base_model.layers[:-20]:
            layer.trainable = False
            
        # Connect MobileNetV2
        x = base_model(x)
        
        # Global pooling and custom top layers
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dense(256, activation='relu', 
                        kernel_regularizer=regularizers.l2(0.0001))(x)
        x = layers.BatchNormalization()(x)
        x = layers.Dropout(0.4)(x)
        
        outputs = layers.Dense(num_classes, activation='softmax')(x)
        
        model = models.Model(inputs=inputs, outputs=outputs)
        
        # Compile model
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
