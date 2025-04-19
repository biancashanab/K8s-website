CREATE DATABASE IF NOT EXISTS chat;
USE chat;

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample messages
INSERT INTO messages (username, message, timestamp) VALUES 
('System', 'Welcome to the chat!', UNIX_TIMESTAMP(NOW())*1000),
('System', 'Please be respectful to other users.', UNIX_TIMESTAMP(NOW())*1000);
