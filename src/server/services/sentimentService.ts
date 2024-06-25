import pool from '../utils/db';
import { analyzeSentiment } from '../utils/sentimentAnalyzer';
import { format } from 'date-fns';
import { RowDataPacket } from 'mysql2';

export async function calculateSentiments() {
    const threeMonthsAgo = format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd');

    const [rows] = await pool.query<RatingComment[]>(`
        SELECT menu_item_id, rating, comment 
        FROM RatingsAndComments 
        WHERE date_posted >= ?`, [threeMonthsAgo]);

    const commentsMap: { [key: number]: string[] } = {};

    rows.forEach((row: any) => {
        if (!commentsMap[row.menu_item_id]) {
            commentsMap[row.menu_item_id] = [];
        }
        commentsMap[row.menu_item_id].push(row.comment);
    });

    for (const menuItemId in commentsMap) {
        const comments = commentsMap[menuItemId];
        const { sentiment, score } = analyzeSentiment(comments);

        const ratings = rows.filter((row: any) => row.menu_item_id === parseInt(menuItemId, 10)).map((row: any) => row.rating);
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

        const [existingSentiment] = await pool.query<SentimentData[]>('SELECT * FROM Sentiments WHERE menu_item_id = ?', [menuItemId]);
        if (existingSentiment.length > 0) {
            await pool.query(
                'UPDATE Sentiments SET sentiment = ?, average_rating = ?, sentiment_score = ?, date_calculated = CURDATE() WHERE menu_item_id = ?',
                [sentiment, averageRating.toFixed(2), score, menuItemId]
            );
        } else {
            await pool.query(
                'INSERT INTO Sentiments (menu_item_id, sentiment, average_rating, sentiment_score, date_calculated) VALUES (?, ?, ?, ?, CURDATE())',
                [menuItemId, sentiment, averageRating.toFixed(2), score]
            );
        }
    }

    console.log('Sentiments Updated....');
}

interface RatingComment extends RowDataPacket {
    menu_item_id: number;
    rating: number;
    comment: string;
}

interface SentimentData extends RowDataPacket {
    menu_item_id: number;
    sentiment: string;
    average_rating: number;
    sentiment_score: number;
    date_calculated: Date;
}