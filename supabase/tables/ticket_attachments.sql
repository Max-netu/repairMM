CREATE TABLE ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);