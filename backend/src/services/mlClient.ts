import axios, { AxiosInstance } from 'axios';

interface PredictRequest {
    patientId: string;
    age: number;
    symptoms: string[];
    vitals?: {
        heartRate?: number;
        bloodPressure?: string;
        temperature?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
    };
    medicalHistory?: string[];
}

interface PredictResponse {
    priority: number; // 1-5 scale
    confidence: number; // 0-1 scale
    reasoning: string;
    timestamp: string;
}

class MLClient {
    private client: AxiosInstance;
    private serviceUrl: string;

    constructor() {
        this.serviceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        this.client = axios.create({
            baseURL: this.serviceUrl,
            timeout: 10000,
        });
    }

    /**
     * Check if ML service is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch (error) {
            console.error('ML Service health check failed:', error);
            return false;
        }
    }

    /**
     * Get triage prediction from ML model
     */
    async predict(request: PredictRequest): Promise<PredictResponse> {
        try {
            const response = await this.client.post<PredictResponse>('/predict', request);
            return response.data;
        } catch (error: any) {
            console.error('ML prediction failed:', error.message);
            throw new Error(`ML Service error: ${error.message}`);
        }
    }

    /**
     * Get model configuration
     */
    async getConfig(): Promise<any> {
        try {
            const response = await this.client.get('/config');
            return response.data;
        } catch (error) {
            console.error('Failed to get ML config:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const mlClient = new MLClient();