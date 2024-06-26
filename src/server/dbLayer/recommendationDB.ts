import { RatingComment, SentimentData } from '../definitions/Interfaces';
import pool from '../utils/db';

export class RecommendationDB {
    async getRecentComments(threeMonthsAgo: string): Promise<RatingComment[]> {
        try {
            const [rows] = await pool.query<RatingComment[]>(
                `SELECT menu_item_id, rating, comment 
                FROM Feedback 
                WHERE date_posted >= ?`, [threeMonthsAgo]);
            return rows;
        } catch (error) {
            console.error(`Failed to retrieve recent comments: ${error}`);
            throw new Error('Error retrieving recent comments.');
        }
    }

    async getExistingSentiment(menuItemId: number): Promise<SentimentData[]> {
        try {
            const [existingSentiment] = await pool.query<SentimentData[]>('SELECT * FROM Sentiment WHERE menu_item_id = ?', [menuItemId]);
            return existingSentiment;
        } catch (error) {
            console.error(`Failed to retrieve existing sentiments: ${error}`);
            throw new Error('Error retrieving existing sentiments.');
        }
    }

    async updateSentiments(menuItemId: number, sentiment: string, averageRating: number, score: number) {
        try {
            await pool.query(
                'UPDATE Sentiment SET sentiment = ?, average_rating = ?, sentiment_score = ?, date_calculated = CURDATE() WHERE menu_item_id = ?',
                [sentiment, averageRating.toFixed(2), score, menuItemId]
            );
        } catch (error) {
            console.error(`Failed to update sentiments: ${error}`);
            throw new Error('Error updating sentiments.');
        }
    }

    async insertSentiments(menuItemId: number, sentiment: string, averageRating: number, score: number) {
        try {
            await pool.query(
                'INSERT INTO Sentiment (menu_item_id, sentiment, average_rating, sentiment_score, date_calculated) VALUES (?, ?, ?, ?, CURDATE())',
                [menuItemId, sentiment, averageRating.toFixed(2), score]
            );
        } catch (error) {
            console.error(`Failed to insert sentiments: ${error}`);
            throw new Error('Error inserting sentiments.');
        }
    }
}