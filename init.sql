-- Wiki Reminder System Database Initialization
-- This file is used by Docker to initialize the database

CREATE DATABASE IF NOT EXISTS wiki_reminder;
USE wiki_reminder;

-- Team Leaders table
CREATE TABLE IF NOT EXISTS team_leaders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    google_chat_id VARCHAR(255),
    outline_user_id VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    reminder_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Wiki Collections table
CREATE TABLE IF NOT EXISTS wiki_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    outline_collection_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    team_leader_id INT NOT NULL,
    last_checked_at DATETIME,
    last_updated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_leader_id) REFERENCES team_leaders(id) ON DELETE CASCADE
);

-- Reminder Logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_leader_id INT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reminder_count INT NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    responded_at DATETIME,
    response_type VARCHAR(50),
    comment TEXT,
    FOREIGN KEY (team_leader_id) REFERENCES team_leaders(id) ON DELETE CASCADE
);

-- Response Tokens table
CREATE TABLE IF NOT EXISTS response_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    team_leader_id INT NOT NULL,
    reminder_log_id INT,
    used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_leader_id) REFERENCES team_leaders(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (`key`, value) VALUES 
    ('manager_email', ''),
    ('cron_schedule', '0 9 * * 1'),
    ('escalation_threshold', '3')
ON DUPLICATE KEY UPDATE value = value;
