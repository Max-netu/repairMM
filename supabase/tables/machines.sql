CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    club_id INT NOT NULL,
    number VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);