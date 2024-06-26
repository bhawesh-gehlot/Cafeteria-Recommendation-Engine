import { RecommendationService } from "../services/recommendationService";

export class RecommendationController {
    private sentimentAnalyzer: RecommendationService;

    constructor() {
        this.sentimentAnalyzer = new RecommendationService();
    }

    public async calculateSentiments() {
        this.sentimentAnalyzer.calculateSentiments();
    }
}