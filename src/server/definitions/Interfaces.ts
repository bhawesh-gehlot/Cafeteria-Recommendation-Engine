import { RowDataPacket } from 'mysql2';

export interface UserId extends RowDataPacket {
    emp_id: number;
}

export interface UserPassword extends RowDataPacket {
    password: string;
}

export interface UserRole extends RowDataPacket {
    role: string;
}

export interface MenuItem extends RowDataPacket {
    menu_item_id: number;
    item_name: string;
    price: number;
    meal_time: string;
    availability_status: string;
    sentiment: string | null;
    average_rating: number | null;
    sentiment_score: number | null;
}

export interface RatingComment extends RowDataPacket {
    menu_item_id: number;
    rating: number;
    comment: string;
}

export interface SentimentData extends RowDataPacket {
    menu_item_id: number;
    sentiment: string;
    average_rating: number;
    sentiment_score: number;
    date_calculated: Date;
}