package com.chat;

import java.io.IOException;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.json.JSONObject;

@ServerEndpoint("/chat")
public class ChatEndpoint {

    private static final Set<Session> sessions = Collections.synchronizedSet(new HashSet<Session>());
    private static final Logger LOGGER = Logger.getLogger(ChatEndpoint.class.getName());
    private DBManager dbManager = new DBManager();

    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
        LOGGER.log(Level.INFO, "WebSocket session opened at /chat: {0}, Total sessions: {1}", 
                   new Object[]{session.getId(), sessions.size()});
        sendHistoryToSession(session);
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        LOGGER.log(Level.INFO, "Received message from {0}: {1}", new Object[]{session.getId(), message});
        try {
            JSONObject jsonMessage = new JSONObject(message);
            if (jsonMessage.has("type") && "HISTORY_REQUEST".equals(jsonMessage.getString("type"))) {
                LOGGER.info("Handling HISTORY_REQUEST for session: " + session.getId());
                sendHistoryToSession(session);
                return;
            }
            
            String username = jsonMessage.getString("username");
            String text = jsonMessage.getString("message");
            long timestamp = new Date().getTime();
            
            JSONObject completeMessage = new JSONObject();
            completeMessage.put("username", username);
            completeMessage.put("message", text);
            completeMessage.put("timestamp", timestamp);
            
            try {
                dbManager.saveMessage(username, text, timestamp);
                LOGGER.log(Level.INFO, "Message saved to database: username={0}, message={1}", 
                          new Object[]{username, text});
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Failed to save message to database", e);
            }
            
            for (Session s : sessions) {
                s.getBasicRemote().sendText(completeMessage.toString());
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error handling message", e);
        }
    }

    private void sendHistoryToSession(Session session) {
        try {
            LOGGER.log(Level.INFO, "Sending history to session: {0}", session.getId());
            List<String> history = dbManager.getHistory();
            LOGGER.log(Level.INFO, "Retrieved {0} messages from history", history.size());
            
            if (history.isEmpty()) {
                JSONObject noHistoryMsg = new JSONObject();
                noHistoryMsg.put("username", "System");
                noHistoryMsg.put("message", "No message history available.");
                noHistoryMsg.put("timestamp", new Date().getTime());
                noHistoryMsg.put("systemMessage", true);
                session.getBasicRemote().sendText(noHistoryMsg.toString());
                LOGGER.log(Level.INFO, "No history available, sent system message to client");
                return;
            }
            
            for (String msg : history) {
                try {
                    session.getBasicRemote().sendText(msg);
                } catch (IOException e) {
                    LOGGER.log(Level.SEVERE, "Error sending history message: " + e.getMessage(), e);
                }
            }
            LOGGER.log(Level.INFO, "History sent successfully. {0} messages.", history.size());
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, "Error sending history to session: " + session.getId() + ", " + e.getMessage(), e);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error while sending history: " + e.getMessage(), e);
        }
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        LOGGER.log(Level.INFO, "WebSocket session closed: {0}, Remaining sessions: {1}", 
                   new Object[]{session.getId(), sessions.size()});
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        sessions.remove(session);
        LOGGER.log(Level.SEVERE, "WebSocket error in session: {0}, Error: {1}", 
                   new Object[]{session.getId(), throwable.getMessage()});
    }
}
