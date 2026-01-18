import React, { useState } from 'react';
import './BooksView.css';

interface Book {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    progress: number;
    status: 'Reading' | 'To Read' | 'Finished';
    rating?: number;
}

const BooksView: React.FC = () => {
    const [books] = useState<Book[]>([
        { id: '1', title: 'The Design of Everyday Things', author: 'Don Norman', coverColor: '#ef4444', progress: 45, status: 'Reading' },
        { id: '2', title: 'Clean Architecture', author: 'Robert C. Martin', coverColor: '#3b82f6', progress: 12, status: 'Reading' },
        { id: '3', title: 'Dune', author: 'Frank Herbert', coverColor: '#f59e0b', progress: 100, status: 'Finished', rating: 5 },
        { id: '4', title: 'Project Hail Mary', author: 'Andy Weir', coverColor: '#10b981', progress: 0, status: 'To Read' },
        { id: '5', title: 'Neuromancer', author: 'William Gibson', coverColor: '#8b5cf6', progress: 0, status: 'To Read' },
    ]);

    return (
        <div className="books-view">
            <div className="books-header">
                <div className="header-tabs">
                    <button className="tab-btn active">Currently Reading</button>
                    <button className="tab-btn">To Read</button>
                    <button className="tab-btn">Finished</button>
                </div>
                <div className="header-stats">
                    <div className="stat">2 Active</div>
                    <div className="stat">15 Total</div>
                </div>
            </div>

            <div className="books-grid">
                {books.map(book => (
                    <div key={book.id} className="book-card">
                        <div className="book-cover" style={{ backgroundColor: book.coverColor }}>
                            <div className="book-spine"></div>
                            <div className="cover-title">{book.title}</div>
                            <div className="cover-author">{book.author}</div>
                        </div>
                        <div className="book-info">
                            <div className="info-row">
                                <span className="status-indicator">{book.status}</span>
                                {book.status === 'Reading' && <span className="percentage">{book.progress}%</span>}
                            </div>
                            {book.status === 'Reading' && (
                                <div className="progress-bar-sm">
                                    <div className="bar-fill" style={{ width: `${book.progress}%` }}></div>
                                </div>
                            )}
                            {book.rating && (
                                <div className="rating">
                                    {'★'.repeat(book.rating)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <div className="book-card add-new">
                    <span className="material-symbols-outlined icon-large">add</span>
                    <span>Add Book</span>
                </div>
            </div>
        </div>
    );
};

export default BooksView;
