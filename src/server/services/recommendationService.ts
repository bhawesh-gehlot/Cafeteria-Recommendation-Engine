import { RecommendationDB } from "../dbLayer/recommendationDB";
import { INTENSIFIERS, NEGATIVE_WORDS, NEUTRAL_WORDS, POSITIVE_WORDS } from "../definitions/constants";
import { RatingComment } from "../definitions/Interfaces";
import { format } from 'date-fns';

export class RecommendationService {
    private recommendationDB: RecommendationDB;
    private positiveWords: Set<string>;
    private negativeWords: Set<string>;
    private neutralWords: Set<string>;
    private intensifiers: Set<string>;

    constructor() {
        this.positiveWords = new Set(POSITIVE_WORDS);
        this.negativeWords = new Set(NEGATIVE_WORDS);
        this.neutralWords = new Set(NEUTRAL_WORDS);
        this.intensifiers = new Set(INTENSIFIERS);
    }

    public async calculateSentiments() {
        try {
            const rows = await this.getRecentComments();
            const commentsMap = this.mapCommentsByMenuItem(rows);

            for (const menuItemId in commentsMap) {
                const comments = commentsMap[menuItemId];
                const { sentiment, score } = this.analyze(comments);

                const ratings = rows
                    .filter(row => row.menu_item_id === parseInt(menuItemId, 10))
                    .map(row => row.rating);
                const averageRating = this.calculateAverageRating(ratings);

                await this.saveSentimentAnalysis(parseInt(menuItemId, 10), sentiment, averageRating, score);
            }

            console.log('Sentiments Updated....');
        } catch (error) {
            console.error('Error updating sentiments:', error);
        }
    }

    private analyze(comments: string[]): { sentiment: string, score: number } {
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        comments.forEach(comment => {
            const result = this.processText(comment);
            positiveCount += result.positiveCount;
            negativeCount += result.negativeCount;
            neutralCount += result.neutralCount;
        });

        return this.calculateSentiment(positiveCount, negativeCount, neutralCount);
    }

    private processText(comment: string): { positiveCount: number, negativeCount: number, neutralCount: number } {
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        const words = comment.toLowerCase().split(/\W+/);
        let modifiedWords = [...words];

        words.forEach((word, index) => {
            if (word === 'not' && index < words.length - 1) {
                const nextWord = words[index + 1];
                if (this.positiveWords.has(nextWord)) {
                    negativeCount += 1;
                    modifiedWords[index + 1] = '';
                } else if (this.negativeWords.has(nextWord)) {
                    positiveCount += 1;
                    modifiedWords[index + 1] = '';
                }
            } else if (this.intensifiers.has(word) && index < words.length - 1) {
                const nextWord = words[index + 1];
                if (this.positiveWords.has(nextWord)) {
                    positiveCount += 2;
                } else if (this.negativeWords.has(nextWord)) {
                    negativeCount += 2;
                }
            }
        });

        modifiedWords.forEach(word => {
            if (this.positiveWords.has(word)) positiveCount += 1;
            if (this.negativeWords.has(word)) negativeCount += 1;
            if (this.neutralWords.has(word)) neutralCount += 1;
        });

        return { positiveCount, negativeCount, neutralCount };
    }

    private calculateSentiment(positiveCount: number, negativeCount: number, neutralCount: number): { sentiment: string, score: number } {
        const totalWords = positiveCount + negativeCount + neutralCount;
        if (totalWords === 0) {
            return { sentiment: 'Average', score: 50 };
        }

        const positiveScore = (positiveCount / totalWords) * 100;
        const negativeScore = (negativeCount / totalWords) * 100;
        const sentimentScore = positiveScore - negativeScore;

        let sentiment: string;
        if (sentimentScore >= 80) {
            sentiment = 'Highly Recommended';
        } else if (sentimentScore >= 60) {
            sentiment = 'Good';
        } else if (sentimentScore >= 40) {
            sentiment = 'Average';
        } else if (sentimentScore >= 20) {
            sentiment = 'Bad';
        } else {
            sentiment = 'Avoid';
        }

        return { sentiment, score: Math.abs(Math.round(sentimentScore)) };
    }

    private async getRecentComments(): Promise<RatingComment[]> {
        const threeMonthsAgo = format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd');
        return await this.recommendationDB.getRecentComments(threeMonthsAgo);
    }

    private mapCommentsByMenuItem(rows: RatingComment[]): { [key: number]: string[] } {
        return rows.reduce((map, row) => {
            if (!map[row.menu_item_id]) {
                map[row.menu_item_id] = [];
            }
            map[row.menu_item_id].push(row.comment);
            return map;
        }, {} as { [key: number]: string[] });
    }

    private async saveSentimentAnalysis(menuItemId: number, sentiment: string, averageRating: number, score: number) {
        const existingSentiment = await this.recommendationDB.getExistingSentiment(menuItemId);

        if (existingSentiment.length > 0) {
            await this.recommendationDB.updateSentiments(menuItemId, sentiment, averageRating, score);
        } else {
            await this.recommendationDB.insertSentiments(menuItemId, sentiment, averageRating, score);
        }
    }

    private calculateAverageRating(ratings: number[]): number {
        if (ratings.length === 0) return 0;
        const total = ratings.reduce((sum, rating) => sum + rating, 0);
        return total / ratings.length;
    }
}
