package com.chat;

import java.net.InetAddress;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Utility class to generate and manage a unique identifier for this application instance
 */
public class InstanceIdentifier {
    private static final Logger LOGGER = Logger.getLogger(InstanceIdentifier.class.getName());
    private static final String INSTANCE_ID;
    
    static {
        // Generate a unique ID for this application instance combining hostname and UUID
        String hostname;
        try {
            hostname = InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Could not get hostname: {0}", e.getMessage());
            hostname = "unknown-host";
        }
        
        // Create a shorter UUID and combine with hostname
        String shortUuid = UUID.randomUUID().toString().split("-")[0];
        INSTANCE_ID = hostname + "-" + shortUuid;
        
        LOGGER.log(Level.INFO, "Instance ID generated: {0}", INSTANCE_ID);
    }
    
    /**
     * Get the unique ID for this application instance
     */
    public static String getId() {
        return INSTANCE_ID;
    }
}