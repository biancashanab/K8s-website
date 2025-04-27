-- Create the chat database
CREATE DATABASE IF NOT EXISTS chat;
USE chat;

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop chatuser if it exists to avoid conflicts
DROP USER IF EXISTS 'chatuser'@'%';
DROP USER IF EXISTS 'chatuser'@'localhost';

-- Create chatuser for all hosts (%) and localhost
CREATE USER 'chatuser'@'%' IDENTIFIED BY 'chatpassword';
CREATE USER 'chatuser'@'localhost' IDENTIFIED BY 'chatpassword';

-- Grant privileges to chatuser for both % and localhost
GRANT ALL PRIVILEGES ON chat.* TO 'chatuser'@'%';
GRANT ALL PRIVILEGES ON chat.* TO 'chatuser'@'localhost';

-- Apply privileges
FLUSH PRIVILEGES;

-- Insert initial messages
INSERT INTO messages (username, message, timestamp) VALUES 
('System', 'Welcome to the chat!', UNIX_TIMESTAMP(NOW())*1000),
('System', 'Please be respectful to other users.', UNIX_TIMESTAMP(NOW())*1000);
