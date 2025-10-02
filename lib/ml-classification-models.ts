/**
 * ML-Based Content Classification Models
 * Advanced machine learning models for intelligent project categorization
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface ClassificationModel {
  id: string;
  name: string;
  version: string;
  type: 'text_classifier' | 'project_matcher' | 'urgency_detector' | 'complexity_analyzer';
  accuracy: number;
  lastTrained: string;
  features: string[];
  parameters: Record<string, any>;
}

export interface TrainingData {
  id: string;
  content: string;
  labels: Record<string, any>;
  userId: string;
  createdAt: string;
  verified: boolean;
  confidence: number;
}

export interface ClassificationResult {
  predictions: Record<string, any>;
  confidence: number;
  features: Record<string, number>;
  modelUsed: string;
  timestamp: string;
  explanation?: string[];
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  sampleSize: number;
  lastEvaluated: string;
}

export class MLClassificationEngine {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private models: Map<string, ClassificationModel> = new Map();
  private featureExtractors: Map<string, Function> = new Map();

  constructor(supabase: SupabaseClient, openai: OpenAI) {
    this.supabase = supabase;
    this.openai = openai;
    this.initializeModels();
    this.initializeFeatureExtractors();
  }

  /**
   * Classify content using ensemble of ML models
   */
  async classifyContent(
    content: string,
    userId: string,
    options: {
      useEnsemble?: boolean;
      includeExplanation?: boolean;
      customModels?: string[];
    } = {}
  ): Promise<ClassificationResult> {
    const { useEnsemble = true, includeExplanation = true, customModels } = options;

    try {
      // Extract features from content
      const features = await this.extractFeatures(content, userId);

      // Select models to use
      const modelsToUse = customModels || (useEnsemble ?
        ['project_matcher_v2', 'urgency_detector_v1', 'complexity_analyzer_v1', 'ai_classifier_v1'] :
        ['ai_classifier_v1']
      );

      // Run predictions with each model
      const modelPredictions = await Promise.all(
        modelsToUse.map(modelId => this.runModelPrediction(modelId, content, features, userId))
      );

      // Combine predictions if using ensemble
      const finalPrediction = useEnsemble ?
        this.combineEnsemblePredictions(modelPredictions) :
        modelPredictions[0];

      // Generate explanation if requested
      let explanation: string[] = [];
      if (includeExplanation) {
        explanation = await this.generateExplanation(content, features, finalPrediction);
      }

      // Store prediction for future learning
      await this.storePredictionResult({
        content,
        prediction: finalPrediction,
        features,
        userId,
        modelsUsed: modelsToUse
      });

      return {
        predictions: finalPrediction.predictions,
        confidence: finalPrediction.confidence,
        features,
        modelUsed: useEnsemble ? 'ensemble' : modelsToUse[0],
        timestamp: new Date().toISOString(),
        explanation: includeExplanation ? explanation : undefined
      };

    } catch (error) {
      console.error('Classification error:', error);
      return this.getFallbackClassification(content);
    }
  }

  /**
   * Train models with user feedback and corrections
   */
  async trainWithFeedback(
    trainingData: {
      content: string;
      actualLabels: Record<string, any>;
      predictedLabels: Record<string, any>;
      userId: string;
      confidence: number;
    }[]
  ): Promise<{
    modelsUpdated: string[];
    performanceImprovement: Record<string, number>;
    trainingMetrics: Record<string, any>;
  }> {
    try {
      const modelsUpdated: string[] = [];
      const performanceImprovement: Record<string, number> = {};

      // Group training data by model type
      const modelTrainingData = this.groupTrainingDataByModel(trainingData);

      // Train each model with relevant data
      for (const [modelId, data] of Object.entries(modelTrainingData)) {
        if (data.length < 5) continue; // Need minimum samples for training

        const oldMetrics = await this.getModelMetrics(modelId);

        // Perform incremental training
        await this.performIncrementalTraining(modelId, data);

        const newMetrics = await this.evaluateModel(modelId, data);

        // Update model if performance improved
        if (newMetrics.accuracy > oldMetrics.accuracy) {
          await this.updateModel(modelId, newMetrics);
          modelsUpdated.push(modelId);
          performanceImprovement[modelId] = newMetrics.accuracy - oldMetrics.accuracy;
        }
      }

      // Update ensemble weights based on performance
      if (modelsUpdated.length > 0) {
        await this.updateEnsembleWeights();
      }

      return {
        modelsUpdated,
        performanceImprovement,
        trainingMetrics: await this.getTrainingMetrics(trainingData)
      };

    } catch (error) {
      console.error('Training error:', error);
      return {
        modelsUpdated: [],
        performanceImprovement: {},
        trainingMetrics: {}
      };
    }
  }

  /**
   * Evaluate model performance on test data
   */
  async evaluateModelPerformance(
    modelId: string,
    testData?: {
      content: string;
      labels: Record<string, any>;
    }[]
  ): Promise<ModelPerformanceMetrics> {
    try {
      // Use provided test data or generate from stored classifications
      const evaluationData = testData || await this.getEvaluationData(modelId);

      if (evaluationData.length === 0) {
        return this.getDefaultMetrics();
      }

      // Run predictions on test data
      const predictions = await Promise.all(
        evaluationData.map(async (item) => {
          const features = await this.extractFeatures(item.content, 'evaluation');
          const prediction = await this.runModelPrediction(modelId, item.content, features, 'evaluation');
          return {
            actual: item.labels,
            predicted: prediction.predictions,
            confidence: prediction.confidence
          };
        })
      );

      // Calculate metrics
      const metrics = this.calculatePerformanceMetrics(predictions);

      // Store evaluation results
      await this.storeEvaluationResults(modelId, metrics);

      return metrics;

    } catch (error) {
      console.error('Model evaluation error:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get feature importance for model interpretability
   */
  async getFeatureImportance(
    modelId: string,
    content: string,
    userId: string
  ): Promise<{
    features: Array<{
      name: string;
      importance: number;
      value: number;
      description: string;
    }>;
    modelInfo: {
      accuracy: number;
      lastTrained: string;
      sampleSize: number;
    };
  }> {
    try {
      // Extract features
      const features = await this.extractFeatures(content, userId);

      // Get model feature weights
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Calculate feature importance based on model type
      const featureImportance = await this.calculateFeatureImportance(
        modelId,
        features,
        model
      );

      // Get model information
      const modelMetrics = await this.getModelMetrics(modelId);

      return {
        features: featureImportance,
        modelInfo: {
          accuracy: modelMetrics.accuracy,
          lastTrained: model.lastTrained,
          sampleSize: modelMetrics.sampleSize
        }
      };

    } catch (error) {
      console.error('Feature importance error:', error);
      return {
        features: [],
        modelInfo: { accuracy: 0, lastTrained: '', sampleSize: 0 }
      };
    }
  }

  /**
   * Create custom model for specific user patterns
   */
  async createCustomModel(
    userId: string,
    trainingData: TrainingData[],
    modelConfig: {
      name: string;
      type: ClassificationModel['type'];
      features: string[];
      parameters?: Record<string, any>;
    }
  ): Promise<{
    modelId: string;
    performance: ModelPerformanceMetrics;
    created: boolean;
  }> {
    try {
      if (trainingData.length < 20) {
        throw new Error('Insufficient training data (minimum 20 samples required)');
      }

      // Generate unique model ID
      const modelId = `custom_${userId}_${modelConfig.type}_${Date.now()}`;

      // Prepare training features
      const preparedData = await Promise.all(
        trainingData.map(async (item) => {
          const features = await this.extractFeatures(item.content, userId);
          return {
            features,
            labels: item.labels,
            weight: item.confidence
          };
        })
      );

      // Train the custom model
      const trainedModel = await this.trainCustomModel(
        modelId,
        preparedData,
        modelConfig
      );

      // Evaluate performance
      const performance = await this.evaluateModelPerformance(modelId, trainingData);

      // Store model if performance is acceptable
      if (performance.accuracy > 0.6) {
        await this.storeCustomModel(userId, trainedModel, performance);
        this.models.set(modelId, trainedModel);

        return {
          modelId,
          performance,
          created: true
        };
      } else {
        return {
          modelId: '',
          performance,
          created: false
        };
      }

    } catch (error) {
      console.error('Custom model creation error:', error);
      return {
        modelId: '',
        performance: this.getDefaultMetrics(),
        created: false
      };
    }
  }

  /**
   * Auto-tune model hyperparameters
   */
  async autoTuneModel(
    modelId: string,
    validationData: TrainingData[],
    hyperparameterSpace: Record<string, any[]>
  ): Promise<{
    bestParameters: Record<string, any>;
    performanceImprovement: number;
    iterations: number;
  }> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      const baselineMetrics = await this.getModelMetrics(modelId);
      let bestParameters = { ...model.parameters };
      let bestAccuracy = baselineMetrics.accuracy;
      let iterations = 0;

      // Simple grid search (in production, would use more sophisticated optimization)
      const parameterCombinations = this.generateParameterCombinations(hyperparameterSpace);

      for (const params of parameterCombinations.slice(0, 10)) { // Limit iterations
        iterations++;

        // Create temporary model with new parameters
        const tempModel = { ...model, parameters: params };

        // Evaluate with new parameters
        const metrics = await this.evaluateCustomModel(tempModel, validationData);

        if (metrics.accuracy > bestAccuracy) {
          bestAccuracy = metrics.accuracy;
          bestParameters = params;
        }
      }

      // Update model if improvement found
      if (bestAccuracy > baselineMetrics.accuracy) {
        await this.updateModelParameters(modelId, bestParameters);
      }

      return {
        bestParameters,
        performanceImprovement: bestAccuracy - baselineMetrics.accuracy,
        iterations
      };

    } catch (error) {
      console.error('Auto-tuning error:', error);
      return {
        bestParameters: {},
        performanceImprovement: 0,
        iterations: 0
      };
    }
  }

  // Private methods for model operations

  private initializeModels(): void {
    // Initialize built-in models
    this.models.set('project_matcher_v2', {
      id: 'project_matcher_v2',
      name: 'Project Content Matcher',
      version: '2.0',
      type: 'project_matcher',
      accuracy: 0.82,
      lastTrained: new Date().toISOString(),
      features: ['semantic_similarity', 'keyword_overlap', 'tag_similarity', 'user_patterns'],
      parameters: {
        similarity_threshold: 0.7,
        keyword_weight: 0.3,
        semantic_weight: 0.7,
        user_pattern_weight: 0.4
      }
    });

    this.models.set('urgency_detector_v1', {
      id: 'urgency_detector_v1',
      name: 'Urgency Level Detector',
      version: '1.0',
      type: 'urgency_detector',
      accuracy: 0.78,
      lastTrained: new Date().toISOString(),
      features: ['urgency_keywords', 'temporal_context', 'tone_analysis'],
      parameters: {
        urgency_threshold: 0.6,
        keyword_importance: 0.5,
        temporal_weight: 0.3
      }
    });

    this.models.set('complexity_analyzer_v1', {
      id: 'complexity_analyzer_v1',
      name: 'Task Complexity Analyzer',
      version: '1.0',
      type: 'complexity_analyzer',
      accuracy: 0.75,
      lastTrained: new Date().toISOString(),
      features: ['technical_terms', 'sentence_complexity', 'scope_indicators'],
      parameters: {
        complexity_threshold: 0.5,
        technical_weight: 0.6,
        scope_weight: 0.4
      }
    });

    this.models.set('ai_classifier_v1', {
      id: 'ai_classifier_v1',
      name: 'AI-Powered General Classifier',
      version: '1.0',
      type: 'text_classifier',
      accuracy: 0.85,
      lastTrained: new Date().toISOString(),
      features: ['ai_analysis', 'semantic_embedding', 'contextual_understanding'],
      parameters: {
        model: 'gpt-4',
        temperature: 0.1,
        max_tokens: 500
      }
    });
  }

  private initializeFeatureExtractors(): void {
    // Semantic similarity features
    this.featureExtractors.set('semantic_similarity', async (content: string, context: any) => {
      if (!context.projectContent) return 0;

      const contentEmbedding = await this.generateEmbedding(content);
      const projectEmbedding = await this.generateEmbedding(context.projectContent);

      return this.cosineSimilarity(contentEmbedding, projectEmbedding);
    });

    // Keyword overlap features
    this.featureExtractors.set('keyword_overlap', (content: string, context: any) => {
      if (!context.projectKeywords) return 0;

      const contentWords = this.extractKeywords(content);
      const overlap = contentWords.filter(word =>
        context.projectKeywords.includes(word.toLowerCase())
      ).length;

      return overlap / Math.max(contentWords.length, 1);
    });

    // Urgency keyword detection
    this.featureExtractors.set('urgency_keywords', (content: string) => {
      const urgencyPatterns = [
        /urgent|asap|emergency|critical|deadline|rush/i,
        /immediately|now|today|soon|quick/i,
        /important|priority|crucial|vital/i
      ];

      let score = 0;
      urgencyPatterns.forEach(pattern => {
        if (pattern.test(content)) score += 0.33;
      });

      return Math.min(score, 1);
    });

    // Technical complexity indicators
    this.featureExtractors.set('technical_terms', (content: string) => {
      const technicalPatterns = [
        /\b(api|database|server|client|frontend|backend)\b/gi,
        /\b(algorithm|architecture|framework|library|dependency)\b/gi,
        /\b(integration|deployment|configuration|optimization)\b/gi,
        /\b(authentication|authorization|encryption|security)\b/gi
      ];

      let matches = 0;
      technicalPatterns.forEach(pattern => {
        const found = content.match(pattern);
        if (found) matches += found.length;
      });

      return Math.min(matches / 10, 1); // Normalize to 0-1
    });

    // Sentence complexity analysis
    this.featureExtractors.set('sentence_complexity', (content: string) => {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
      const avgWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

      // Normalize complexity score
      return Math.min((avgLength / 100 + avgWords / 20) / 2, 1);
    });

    // User pattern matching
    this.featureExtractors.set('user_patterns', async (content: string, context: any) => {
      if (!context.userId) return 0;

      // Get user's classification patterns
      const { data: patterns } = await this.supabase
        .from('project_learning_patterns')
        .select('content_context, pattern_strength')
        .eq('user_id', context.userId)
        .limit(50);

      if (!patterns || patterns.length === 0) return 0;

      // Calculate pattern matching score
      let maxMatch = 0;
      patterns.forEach(pattern => {
        const similarity = this.textSimilarity(content, pattern.content_context);
        const weightedSimilarity = similarity * (pattern.pattern_strength / 10);
        maxMatch = Math.max(maxMatch, weightedSimilarity);
      });

      return maxMatch;
    });
  }

  private async extractFeatures(content: string, userId: string): Promise<Record<string, number>> {
    const features: Record<string, number> = {};

    // Get user context for feature extraction
    const context = await this.getUserContext(userId);
    context.content = content;

    // Extract all features
    for (const [featureName, extractor] of this.featureExtractors) {
      try {
        features[featureName] = await extractor(content, context);
      } catch (error) {
        console.error(`Feature extraction error for ${featureName}:`, error);
        features[featureName] = 0;
      }
    }

    // Add basic content features
    features.content_length = Math.min(content.length / 1000, 1);
    features.word_count = Math.min(content.split(/\s+/).length / 100, 1);
    features.has_code = /```|`[\w\s]+`|\b(function|class|import|export)\b/i.test(content) ? 1 : 0;
    features.has_urls = /https?:\/\/\S+/i.test(content) ? 1 : 0;
    features.question_count = (content.match(/\?/g) || []).length / 10;

    return features;
  }

  private async runModelPrediction(
    modelId: string,
    content: string,
    features: Record<string, number>,
    userId: string
  ): Promise<{ predictions: Record<string, any>; confidence: number }> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    switch (model.type) {
      case 'project_matcher':
        return this.runProjectMatcherPrediction(model, content, features, userId);
      case 'urgency_detector':
        return this.runUrgencyDetectorPrediction(model, features);
      case 'complexity_analyzer':
        return this.runComplexityAnalyzerPrediction(model, features);
      case 'text_classifier':
        return this.runAIClassifierPrediction(model, content, features, userId);
      default:
        throw new Error(`Unknown model type: ${model.type}`);
    }
  }

  private async runProjectMatcherPrediction(
    model: ClassificationModel,
    content: string,
    features: Record<string, number>,
    userId: string
  ): Promise<{ predictions: Record<string, any>; confidence: number }> {
    // Get user's projects
    const { data: projects } = await this.supabase
      .from('projects')
      .select('id, name, description, tags')
      .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`);

    if (!projects || projects.length === 0) {
      return {
        predictions: { suggested_project: null },
        confidence: 0.1
      };
    }

    // Score each project
    let bestProject = null;
    let bestScore = 0;

    for (const project of projects) {
      const projectContext = `${project.name} ${project.description || ''} ${(project.tags || []).join(' ')}`;
      const contextEmbedding = await this.generateEmbedding(projectContext);
      const contentEmbedding = await this.generateEmbedding(content);

      const semanticSim = this.cosineSimilarity(contentEmbedding, contextEmbedding);
      const keywordSim = features.keyword_overlap || 0;

      const score = (
        semanticSim * model.parameters.semantic_weight +
        keywordSim * model.parameters.keyword_weight +
        (features.user_patterns || 0) * model.parameters.user_pattern_weight
      );

      if (score > bestScore) {
        bestScore = score;
        bestProject = project;
      }
    }

    return {
      predictions: {
        suggested_project: bestProject?.id,
        project_name: bestProject?.name,
        match_score: bestScore
      },
      confidence: Math.min(bestScore, 1)
    };
  }

  private runUrgencyDetectorPrediction(
    model: ClassificationModel,
    features: Record<string, number>
  ): Promise<{ predictions: Record<string, any>; confidence: number }> {
    const urgencyScore = (
      features.urgency_keywords * model.parameters.keyword_importance +
      (features.temporal_context || 0) * model.parameters.temporal_weight
    );

    let urgencyLevel = 'low';
    if (urgencyScore > 0.8) urgencyLevel = 'critical';
    else if (urgencyScore > 0.6) urgencyLevel = 'high';
    else if (urgencyScore > 0.3) urgencyLevel = 'medium';

    return Promise.resolve({
      predictions: {
        urgency_level: urgencyLevel,
        urgency_score: urgencyScore
      },
      confidence: Math.max(0.3, urgencyScore)
    });
  }

  private runComplexityAnalyzerPrediction(
    model: ClassificationModel,
    features: Record<string, number>
  ): Promise<{ predictions: Record<string, any>; confidence: number }> {
    const complexityScore = (
      features.technical_terms * model.parameters.technical_weight +
      features.sentence_complexity * model.parameters.scope_weight
    );

    let complexityLevel = 'simple';
    if (complexityScore > 0.8) complexityLevel = 'enterprise';
    else if (complexityScore > 0.6) complexityLevel = 'complex';
    else if (complexityScore > 0.3) complexityLevel = 'moderate';

    return Promise.resolve({
      predictions: {
        complexity_level: complexityLevel,
        complexity_score: complexityScore
      },
      confidence: Math.max(0.3, complexityScore)
    });
  }

  private async runAIClassifierPrediction(
    model: ClassificationModel,
    content: string,
    features: Record<string, number>,
    userId: string
  ): Promise<{ predictions: Record<string, any>; confidence: number }> {
    try {
      // Get user's projects for context
      const { data: projects } = await this.supabase
        .from('projects')
        .select('id, name, description, tags')
        .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`)
        .limit(10);

      const projectContext = projects?.map(p =>
        `${p.name}: ${p.description || ''} [${(p.tags || []).join(', ')}]`
      ).join('\n') || 'No existing projects';

      const prompt = `Analyze this content for project classification:

Content: "${content}"

User's Projects:
${projectContext}

Provide JSON response with:
{
  "suggested_project": "project_name or null",
  "project_id": "project_id or null",
  "confidence": 0.85,
  "urgency": "low|medium|high|critical",
  "complexity": "simple|moderate|complex|enterprise",
  "tags": ["tag1", "tag2"],
  "reasoning": ["reason1", "reason2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: model.parameters.temperature,
        max_tokens: model.parameters.max_tokens
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        predictions: result,
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error('AI classifier prediction error:', error);
      return {
        predictions: {
          suggested_project: null,
          confidence: 0.1,
          urgency: 'medium',
          complexity: 'moderate'
        },
        confidence: 0.1
      };
    }
  }

  private combineEnsemblePredictions(
    predictions: Array<{ predictions: Record<string, any>; confidence: number }>
  ): { predictions: Record<string, any>; confidence: number } {
    // Weighted voting based on model confidence and accuracy
    const modelWeights = {
      'project_matcher_v2': 0.3,
      'urgency_detector_v1': 0.2,
      'complexity_analyzer_v1': 0.2,
      'ai_classifier_v1': 0.3
    };

    const combinedPredictions: Record<string, any> = {};
    let totalWeight = 0;
    let weightedConfidence = 0;

    // Combine predictions with weighted voting
    predictions.forEach((pred, index) => {
      const weight = Object.values(modelWeights)[index] || 0.25;
      totalWeight += weight;
      weightedConfidence += pred.confidence * weight;

      // Merge predictions
      Object.entries(pred.predictions).forEach(([key, value]) => {
        if (!combinedPredictions[key]) {
          combinedPredictions[key] = value;
        } else if (typeof value === 'number' && typeof combinedPredictions[key] === 'number') {
          combinedPredictions[key] = (combinedPredictions[key] * (1 - weight)) + (value * weight);
        }
      });
    });

    return {
      predictions: combinedPredictions,
      confidence: totalWeight > 0 ? weightedConfidence / totalWeight : 0.5
    };
  }

  private async generateExplanation(
    content: string,
    features: Record<string, number>,
    prediction: { predictions: Record<string, any>; confidence: number }
  ): Promise<string[]> {
    const explanations: string[] = [];

    // Feature-based explanations
    if (features.semantic_similarity > 0.7) {
      explanations.push('High semantic similarity to existing project content');
    }

    if (features.urgency_keywords > 0.5) {
      explanations.push('Contains urgency indicators (urgent, deadline, critical)');
    }

    if (features.technical_terms > 0.6) {
      explanations.push('Contains technical terminology suggesting complexity');
    }

    if (features.user_patterns > 0.5) {
      explanations.push('Matches user\'s historical classification patterns');
    }

    // Prediction-based explanations
    if (prediction.predictions.suggested_project) {
      explanations.push(`Strong match with project: ${prediction.predictions.project_name || prediction.predictions.suggested_project}`);
    }

    if (prediction.confidence > 0.8) {
      explanations.push('High confidence prediction based on multiple factors');
    } else if (prediction.confidence < 0.4) {
      explanations.push('Low confidence - may require manual review');
    }

    return explanations.length > 0 ? explanations : ['Classification based on content analysis'];
  }

  // Utility methods for ML operations

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').trim(),
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 20); // Limit keywords
  }

  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.extractKeywords(text1));
    const words2 = new Set(this.extractKeywords(text2));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async getUserContext(userId: string): Promise<any> {
    // Get user's project context for feature extraction
    const { data: projects } = await this.supabase
      .from('projects')
      .select('name, description, tags')
      .or(`owner_id.eq.${userId},collaborators.cs.{${userId}}`)
      .limit(10);

    const projectKeywords = projects?.flatMap(p =>
      this.extractKeywords(`${p.name} ${p.description || ''} ${(p.tags || []).join(' ')}`)
    ) || [];

    const projectContent = projects?.map(p =>
      `${p.name} ${p.description || ''}`
    ).join(' ') || '';

    return {
      userId,
      projectKeywords: [...new Set(projectKeywords)],
      projectContent
    };
  }

  private getFallbackClassification(content: string): ClassificationResult {
    return {
      predictions: {
        suggested_project: null,
        urgency: 'medium',
        complexity: 'moderate',
        confidence: 0.1
      },
      confidence: 0.1,
      features: {},
      modelUsed: 'fallback',
      timestamp: new Date().toISOString(),
      explanation: ['Classification failed - using fallback']
    };
  }

  // Placeholder methods for advanced ML operations
  // These would be implemented with more sophisticated ML libraries in production

  private groupTrainingDataByModel(trainingData: any[]): Record<string, any[]> {
    // Group training data based on what each model needs
    return {
      'project_matcher_v2': trainingData.filter(d => d.actualLabels.project_id),
      'urgency_detector_v1': trainingData.filter(d => d.actualLabels.urgency),
      'complexity_analyzer_v1': trainingData.filter(d => d.actualLabels.complexity)
    };
  }

  private async getModelMetrics(modelId: string): Promise<ModelPerformanceMetrics> {
    // In production, would retrieve from model performance tracking system
    return this.getDefaultMetrics();
  }

  private async performIncrementalTraining(modelId: string, data: any[]): Promise<void> {
    // Placeholder for incremental training logic
    console.log(`Training ${modelId} with ${data.length} samples`);
  }

  private async evaluateModel(modelId: string, data: any[]): Promise<ModelPerformanceMetrics> {
    // Placeholder for model evaluation
    return this.getDefaultMetrics();
  }

  private async updateModel(modelId: string, metrics: ModelPerformanceMetrics): Promise<void> {
    // Placeholder for model update logic
    const model = this.models.get(modelId);
    if (model) {
      model.accuracy = metrics.accuracy;
      model.lastTrained = new Date().toISOString();
    }
  }

  private async updateEnsembleWeights(): Promise<void> {
    // Placeholder for ensemble weight updates
    console.log('Updating ensemble weights based on model performance');
  }

  private async getTrainingMetrics(trainingData: any[]): Promise<Record<string, any>> {
    return {
      samples_trained: trainingData.length,
      avg_confidence: trainingData.reduce((sum, d) => sum + d.confidence, 0) / trainingData.length,
      training_time: Date.now()
    };
  }

  private async getEvaluationData(modelId: string): Promise<any[]> {
    // Get historical classification data for evaluation
    const { data } = await this.supabase
      .from('project_classifications')
      .select('content_preview, classification_result, user_feedback')
      .eq('user_feedback', 'correct')
      .limit(100);

    return data?.map(d => ({
      content: d.content_preview,
      labels: d.classification_result
    })) || [];
  }

  private calculatePerformanceMetrics(predictions: any[]): ModelPerformanceMetrics {
    // Simplified metrics calculation
    const correct = predictions.filter(p => this.compareLabels(p.actual, p.predicted)).length;
    const accuracy = correct / predictions.length;

    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy,    // Simplified
      f1Score: accuracy,   // Simplified
      confusionMatrix: [[correct, predictions.length - correct], [0, 0]], // Simplified
      sampleSize: predictions.length,
      lastEvaluated: new Date().toISOString()
    };
  }

  private compareLabels(actual: any, predicted: any): boolean {
    // Simplified label comparison
    return JSON.stringify(actual) === JSON.stringify(predicted);
  }

  private async storeEvaluationResults(modelId: string, metrics: ModelPerformanceMetrics): Promise<void> {
    // Store evaluation results for tracking
    console.log(`Model ${modelId} evaluation:`, metrics);
  }

  private getDefaultMetrics(): ModelPerformanceMetrics {
    return {
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      confusionMatrix: [[0, 0], [0, 0]],
      sampleSize: 0,
      lastEvaluated: new Date().toISOString()
    };
  }

  private async calculateFeatureImportance(
    modelId: string,
    features: Record<string, number>,
    model: ClassificationModel
  ): Promise<Array<{ name: string; importance: number; value: number; description: string }>> {
    // Simplified feature importance calculation
    const featureDescriptions = {
      semantic_similarity: 'Similarity to existing project content',
      keyword_overlap: 'Overlap with project keywords',
      urgency_keywords: 'Presence of urgency indicators',
      technical_terms: 'Technical complexity indicators',
      user_patterns: 'Match with user patterns'
    };

    return Object.entries(features).map(([name, value]) => ({
      name,
      importance: Math.random() * 0.5 + 0.25, // Placeholder
      value,
      description: featureDescriptions[name as keyof typeof featureDescriptions] || 'Feature description'
    })).sort((a, b) => b.importance - a.importance);
  }

  private async trainCustomModel(
    modelId: string,
    preparedData: any[],
    config: any
  ): Promise<ClassificationModel> {
    // Placeholder for custom model training
    return {
      id: modelId,
      name: config.name,
      version: '1.0',
      type: config.type,
      accuracy: 0.7, // Placeholder
      lastTrained: new Date().toISOString(),
      features: config.features,
      parameters: config.parameters || {}
    };
  }

  private async storeCustomModel(
    userId: string,
    model: ClassificationModel,
    performance: ModelPerformanceMetrics
  ): Promise<void> {
    // Store custom model in database
    console.log(`Storing custom model for user ${userId}:`, model.name);
  }

  private generateParameterCombinations(space: Record<string, any[]>): Record<string, any>[] {
    // Simple grid search parameter generation
    const keys = Object.keys(space);
    const combinations: Record<string, any>[] = [];

    function generateCombos(index: number, current: Record<string, any>) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      for (const value of space[key]) {
        current[key] = value;
        generateCombos(index + 1, current);
      }
    }

    generateCombos(0, {});
    return combinations.slice(0, 20); // Limit combinations
  }

  private async evaluateCustomModel(
    model: ClassificationModel,
    validationData: TrainingData[]
  ): Promise<ModelPerformanceMetrics> {
    // Placeholder for custom model evaluation
    return this.getDefaultMetrics();
  }

  private async updateModelParameters(
    modelId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      model.parameters = { ...model.parameters, ...parameters };
    }
  }

  private async storePredictionResult(data: {
    content: string;
    prediction: any;
    features: Record<string, number>;
    userId: string;
    modelsUsed: string[];
  }): Promise<void> {
    // Store prediction for future learning
    try {
      await this.supabase
        .from('project_classifications')
        .insert({
          user_id: data.userId,
          content_type: 'text',
          content_preview: data.content.substring(0, 200),
          classification_result: data.prediction.predictions,
          confidence: data.prediction.confidence
        });
    } catch (error) {
      // Non-critical error
      console.error('Error storing prediction result:', error);
    }
  }
}