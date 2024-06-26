import pool from '../../utils/db';
import { format } from 'date-fns';
import { RowDataPacket } from 'mysql2';

const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'delicious', 'tasty', 'love', 'fantastic', 'wonderful', 
    'awesome', 'pleasant', 'enjoyable', 'nice', 'superb', 'yummy', 'satisfying', 'perfect', 'positive',
    'brilliant', 'spectacular', 'like', 'enjoy', 'happy', 'pleased', 'pleasing', 'outstanding', 'splendid', 'remarkable', 'exceptional'
];

const negativeWords = [
    'bad', 'terrible', 'awful', 'disgusting', 'poor', 'hate', 'unpleasant', 'horrible', 'nasty', 'not',
    'dreadful', 'subpar', 'unappetizing', 'atrocious', 'gross', 'dislike', 'worst', 'negative',
    'inferior', 'unsatisfactory', 'appalling', 'sad', 'unsatisfied', 'unhappy', 'displeased', 'horrific', 'abysmal', 'pathetic', 'lousy'
];

const neutralWords = [
    'average', 'mediocre', 'ok', 'fine', 'fair', 'decent', 'standard', 'ordinary', 'typical'
];

const intensifiers = [
    'very', 'extremely', 'absolutely', 'highly', 'incredibly', 'really', 'quite', 'super', 'truly', 'remarkably'
];

function analyzeSentiment(comments: string[]): { sentiment: string, score: number } {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let totalWords = 0;

    comments.forEach(comment => {
        const words = comment.toLowerCase().split(/\W+/);
        let modifiedWords = [...words];

        words.forEach((word, index) => {
            if (word === 'not' && index < words.length - 1) {
                const nextWord = words[index + 1];
                if (positiveWords.includes(nextWord)) {
                    negativeCount += 1;
                    modifiedWords[index + 1] = '';
                } else if (negativeWords.includes(nextWord)) {
                    positiveCount += 1;
                    modifiedWords[index + 1] = '';
                }
            }
        });

        modifiedWords.forEach(word => {
            if (positiveWords.includes(word)) positiveCount += 1;
            if (negativeWords.includes(word)) negativeCount += 1;
            if (neutralWords.includes(word)) neutralCount += 1;
        });
    });

    totalWords = positiveCount + negativeCount + neutralCount;
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