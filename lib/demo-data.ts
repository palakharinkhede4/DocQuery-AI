export interface DemoDocument {
  name: string;
  content: string;
}

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    name: "01_transformer_architecture.txt",
    content: `Transformer Architecture (Vaswani et al., 2017) relies entirely on self-attention mechanisms to compute representations of its input and output without using sequence-aligned RNNs or convolution. The Transformer consists of an Encoder and a Decoder stack. The Encoder converts an input sequence of symbol representations into a sequence of continuous representations. The Decoder generates an output sequence of symbols one element at a time. The multi-head attention mechanism allows the model to jointly attend to information from different representation subspaces at different positions.`
  },
  {
    name: "02_attention_mechanism.txt",
    content: `The Attention Mechanism calculates a weighted sum of values, where the weight assigned to each value is computed by a query with the corresponding key. Scaled Dot-Product Attention computes query-key dot products scaled by the square root of the key dimension, followed by a softmax function to obtain weights. Multi-Head Attention projects queries, keys, and values h times with different learned linear projections, allowing the network to capture complex contextual dependencies.`
  },
  {
    name: "03_gradient_descent.txt",
    content: `Gradient Descent is a first-order iterative optimization algorithm used to find local minima of a differentiable loss function. In training machine learning models, model parameters (weights and biases) are iteratively updated in the opposite direction of the gradient of the loss function with respect to the parameters. Variants include Stochastic Gradient Descent (SGD), Batch Gradient Descent, and Mini-batch Gradient Descent. Popular adaptive optimizers like Adam and RMSprop adjust learning rates dynamically per parameter.`
  },
  {
    name: "04_convolutional_neural_networks.txt",
    content: `Convolutional Neural Networks (CNNs) are specialized deep neural architectures designed for processing grid-like data, such as images. CNNs utilize convolutional layers where learnable filters slide across spatial dimensions to compute feature maps. Key components include Convolutional Layers for feature extraction, Pooling Layers (Max Pooling / Average Pooling) for spatial dimensionality reduction, and Fully Connected (Dense) layers for final classification.`
  },
  {
    name: "05_rag_and_vector_databases.txt",
    content: `Retrieval-Augmented Generation (RAG) combines dense vector retrieval with large language models to answer queries grounded in external knowledge bases. Vector databases like FAISS, Qdrant, and Chroma index dense embeddings of text chunks. During retrieval, similarity search (e.g., Cosine Similarity or Inner Product) identifies top-k context passages relevant to the query. The LLM then generates an answer referencing the retrieved snippets, minimizing hallucinations.`
  },
  {
    name: "06_supervised_vs_unsupervised.txt",
    content: `Supervised Learning algorithms train models on labeled datasets containing both feature inputs and target outputs (e.g., classification and regression). Unsupervised Learning algorithms process unlabeled data to discover underlying patterns, clusters, or latent structures (e.g., K-Means clustering, Principal Component Analysis, and autoencoders). Reinforcement Learning trains agents to make sequences of decisions by interacting with an environment to maximize cumulative rewards.`
  },
  {
    name: "07_overfitting_and_regularization.txt",
    content: `Overfitting occurs when a machine learning model learns the training data noise and random fluctuations rather than the underlying pattern, leading to high training accuracy but poor generalization on unseen validation data. Regularization techniques penalize model complexity to prevent overfitting. Common methods include L1 Regularization (Lasso, causing weight sparsity), L2 Regularization (Ridge / Weight Decay, constraining weight magnitude), Dropout (randomly deactivating neurons during training), and Early Stopping.`
  },
  {
    name: "08_recurrent_neural_networks.txt",
    content: `Recurrent Neural Networks (RNNs) process sequential data by maintaining a hidden state vector acting as memory across time steps. However, standard RNNs suffer from vanishing and exploding gradient problems when processing long sequences. Long Short-Term Memory (LSTM) networks solve this using specialized gating mechanisms: the Forget Gate (deciding what info to discard), Input Gate (updating cell state), and Output Gate (determining output value).`
  },
  {
    name: "09_transfer_learning.txt",
    content: `Transfer Learning is a machine learning technique where a pre-trained model developed for a source task is reused as the starting point for a model on a target task. In Computer Vision and Natural Language Processing (NLP), models pre-trained on massive datasets (e.g., ImageNet, Wikipedia, C4) are fine-tuned on smaller domain-specific datasets. Fine-tuning saves compute resources, speeds up convergence, and dramatically improves performance on sparse datasets.`
  },
  {
    name: "10_fastapi_framework.txt",
    content: `FastAPI is a high-performance modern web framework for building RESTful APIs with Python based on standard Python type hints. Built on Starlette for async web routing and Pydantic for data validation, FastAPI provides automatic interactive API documentation (OpenAPI / Swagger UI), asynchronous request handling (async/await), and high throughput comparable to NodeJS and Go.`
  },
  {
    name: "11_docker_containerization.txt",
    content: `Docker is an open-source platform that automates application deployment inside OS-level lightweight virtualized containers. A Dockerfile specifies the base image, environment variables, dependencies, system libraries, and execution entrypoints. Docker containers package code along with system runtimes, guaranteeing consistent execution across local development machines, staging clusters, and production cloud environments.`
  },
  {
    name: "12_model_evaluation_metrics.txt",
    content: `Model Evaluation Metrics assess performance across machine learning tasks. For classification, metrics include Accuracy, Precision (true positives / predicted positives), Recall (true positives / actual positives), F1 Score (harmonic mean of Precision and Recall), and Area Under ROC Curve (AUC-ROC). For regression tasks, metrics include Mean Squared Error (MSE), Root Mean Squared Error (RMSE), Mean Absolute Error (MAE), and R-squared (R2 score).`
  },
  {
    name: "6.-rainwater-collection-and-storage_web.txt",
    content: `Rainwater Harvesting and Collection Technical Guide:
A rainwater harvesting system captures precipitation from catchment surfaces such as roofs and channels it through gutters, downpipes, and filters into dedicated storage tanks or underground cisterns.

Key Components:
1. Catchment Surface: The roof or surface with suitable runoff coefficient (e.g., corrugated iron, tiles, or concrete) that collects rainfall. Non-permeable smooth materials minimize contamination.
2. Conveyance & Gutters: Channels that direct water from the roof to storage. Gutters must have a consistent slope (1:100) to prevent stagnant pools and mosquito breeding.
3. First Flush Diverter: Diverts the initial highly-contaminated runoff containing bird droppings, dust, and debris away from the main cistern.
4. Filtration System: Coarse leaf screens, sediment mesh filters, and gravel/sand filters to remove suspended solids prior to tank entry.
5. Storage Tank / Cistern: Constructed from food-grade polyethylene, reinforced concrete, or masonry. Must include an overflow pipe with insect/vermin screen, inspection manhole, and bottom drain for periodic desiltation.
6. Extraction & Distribution: Gravity-fed tap or solar/electric pump delivering treated water for non-potable or potable uses.`
  },
  {
    name: "ml_notes.txt",
    content: `Comprehensive Machine Learning and Deep Learning Reference Notes:

1. Supervised Learning:
Supervised learning models learn mapping functions from input features X to labeled targets Y.
- Linear Models: Linear Regression for continuous target predictions; Logistic Regression using the Sigmoid activation 1 / (1 + e^-z) for binary probability classification.
- Decision Trees and Ensemble Methods: Random Forests aggregate multiple de-correlated decision trees via bagging; Gradient Boosting (XGBoost, LightGBM, CatBoost) sequentially builds trees by fitting pseudo-residuals.
- Support Vector Machines (SVM): Maximize margin between decision boundary hyperplane and closest support vectors using kernel tricks (RBF, Polynomial).

2. Neural Networks & Deep Learning:
- Multi-Layer Perceptron (MLP): Layers of artificial neurons with non-linear activation functions (ReLU, GELU, Swish).
- Backpropagation: Uses the chain rule of calculus to compute loss gradients with respect to all layer weights.
- Optimizers: Stochastic Gradient Descent (SGD) with Momentum, Adam (Adaptive Moment Estimation), AdamW with decoupled weight decay.
- Loss Functions: Cross-Entropy Loss for multi-class classification; Mean Squared Error (MSE) / Huber Loss for regression.

3. Evaluation and Regularization:
- Metrics: Precision = TP / (TP + FP); Recall = TP / (TP + FN); F1 Score = 2 * (Precision * Recall) / (Precision + Recall).
- Techniques: L2 Regularization adds quadratic penalty on weights; Dropout randomly zeros activations during forward pass; Batch Normalization stabilizes internal covariate shift.`
  }
];
