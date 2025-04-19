package com.chat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONObject;

public class DBManager {
    
    private static final Logger LOGGER = Logger.getLogger(DBManager.class.getName());
    private String dbUrl = System.getenv("DB_URL") != null ? System.getenv("DB_URL") : "jdbc:mysql://db:3306/chat";
    private String dbUser = System.getenv("DB_USER") != null ? System.getenv("DB_USER") : "chatuser";
    private String dbPassword = System.getenv("DB_PASSWORD") != null ? System.getenv("DB_PASSWORD") : "chatpassword";
    
    public DBManager() 
    {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            LOGGER.log(Level.SEVERE, "MySQL JDBC Driver not found", e);
        }
    }
    
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl, dbUser, dbPassword);
    }
    
    public void saveMessage(String username, String message, long timestamp) 
    {
        String sql = "INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)";
        
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) 
        {
            
            LOGGER.log(Level.INFO, "Database connection established: " + conn.getMetaData().getURL());
            
            stmt.setString(1, username);
            stmt.setString(2, message);
            stmt.setLong(3, timestamp);
            
            int rowsAffected = stmt.executeUpdate();
            LOGGER.log(Level.INFO, "Message saved to database. Rows affected: " + rowsAffected);
            
        } 
        catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error saving message to database: " + e.getMessage(), e);
        }
    }
    
    // Returnează toate mesajele din istoric, ordonate cronologic
    public List<String> getHistory() {
        return getHistory(150);             // Implicit, limităm la 150 mesaje
    }
    
    /** 
     * Returnează un număr limitat de mesaje din istoric, ordonate cronologic
     * @param limit Numărul maxim de mesaje returnate
     */
    public List<String> getHistory(int limit) 
    {
        List<String> messages = new ArrayList<>();
        String sql = "SELECT username, message, timestamp FROM messages ORDER BY timestamp ASC LIMIT ?";
        
        try (Connection conn = getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            LOGGER.log(Level.INFO, "Database connection established for history: " + conn.getMetaData().getURL());
            
            stmt.setInt(1, limit);
            ResultSet rs = stmt.executeQuery();
            
            int messageCount = 0;
            while (rs.next()) 
            {
                JSONObject message = new JSONObject();
                message.put("username", rs.getString("username"));
                message.put("message", rs.getString("message"));
                message.put("timestamp", rs.getLong("timestamp"));
                messages.add(message.toString());
                messageCount++;
            }
            
            LOGGER.log(Level.INFO, "Retrieved " + messageCount + " messages from database");
            
            // Verificare suplimentară pentru a detecta probleme
            if (messageCount == 0) 
            {
                try 
                {
                    Statement checkStmt = conn.createStatement();
                    ResultSet countRs = checkStmt.executeQuery("SELECT COUNT(*) as count FROM messages");

                    if (countRs.next()) {
                        int totalCount = countRs.getInt("count");
                        LOGGER.log(Level.INFO, "Total messages in database: " + totalCount);
                    }
                    countRs.close();
                    checkStmt.close();
                }
                catch (SQLException e) {
                    LOGGER.log(Level.SEVERE, "Error checking message count: " + e.getMessage(), e);
                }
            }
            
        } catch (SQLException e) {
            LOGGER.log(Level.SEVERE, "Error retrieving message history: " + e.getMessage(), e);
        }
        
        return messages;
    }
}
