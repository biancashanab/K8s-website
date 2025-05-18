package com.chat;

import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.clients.jedis.JedisPubSub;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;

public class RedisManager {
    private static final Logger LOGGER = Logger.getLogger(RedisManager.class.getName());
    private static final String CHAT_CHANNEL = "chat";
    
    private final JedisPool jedisPool;
    private JedisPubSub jedisPubSub;
    private Thread subscriberThread;
    private boolean isConnected = false;

    public RedisManager() {
        LOGGER.info("Initializing RedisManager");
        
        // Initialize jedisPool with a default value
        JedisPool pool = null;
        
        try {
            // Get Redis configuration from environment variables with defaults
            String redisUrl = getEnvWithDefault("REDIS_URL", null);
            String redisHost = getEnvWithDefault("REDIS_HOST", "redis");
            String redisPortStr = getEnvWithDefault("REDIS_PORT", "6379");
            int redisPort = 6379; // Default port
            
            // Configure connection pool
            JedisPoolConfig poolConfig = new JedisPoolConfig();
            poolConfig.setMaxTotal(10);
            poolConfig.setMaxIdle(5);
            poolConfig.setMinIdle(1);
            poolConfig.setTestOnBorrow(true);
            poolConfig.setTestOnReturn(true);
            poolConfig.setTestWhileIdle(true);
            
            // Handle REDIS_URL if provided (takes precedence over HOST/PORT)
            if (redisUrl != null && !redisUrl.isEmpty()) {
                LOGGER.log(Level.INFO, "Using Redis URL: {0}", redisUrl);
                try {
                    // Handle URLs like "tcp://10.152.183.45:6379" or "redis://hostname:port"
                    if (redisUrl.startsWith("tcp://") || redisUrl.startsWith("redis://")) {
                        URI redisUri = new URI(redisUrl);
                        redisHost = redisUri.getHost();
                        redisPort = redisUri.getPort() > 0 ? redisUri.getPort() : 6379;
                        LOGGER.log(Level.INFO, "Parsed Redis URL to host={0}, port={1}", 
                                  new Object[]{redisHost, redisPort});
                    } else if (redisUrl.contains(":")) {
                        // Handle simple host:port format
                        String[] parts = redisUrl.split(":");
                        redisHost = parts[0];
                        redisPort = Integer.parseInt(parts[1]);
                        LOGGER.log(Level.INFO, "Parsed Redis URL to host={0}, port={1}", 
                                  new Object[]{redisHost, redisPort});
                    } else {
                        // Assume just a hostname
                        redisHost = redisUrl;
                        LOGGER.log(Level.INFO, "Using Redis host={0} with default port={1}", 
                                  new Object[]{redisHost, redisPort});
                    }
                } catch (URISyntaxException | NumberFormatException e) {
                    LOGGER.log(Level.WARNING, "Failed to parse Redis URL '{0}': {1}. Using defaults.", 
                              new Object[]{redisUrl, e.getMessage()});
                }
            } else {
                // Parse port from environment variable
                try {
                    redisPort = Integer.parseInt(redisPortStr);
                } catch (NumberFormatException e) {
                    LOGGER.log(Level.WARNING, "Invalid Redis port: {0}. Using default port 6379.", redisPortStr);
                }
                LOGGER.log(Level.INFO, "Using Redis host={0}, port={1}", new Object[]{redisHost, redisPort});
            }
            
            // Create the Jedis pool
            pool = new JedisPool(poolConfig, redisHost, redisPort);
            
            // Test connection
            try (Jedis jedis = pool.getResource()) {
                String pong = jedis.ping();
                if ("PONG".equals(pong)) {
                    LOGGER.info("Successfully connected to Redis");
                    isConnected = true;
                }
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Failed to connect to Redis: {0}. Chat will work locally but not across multiple instances.", 
                          e.getMessage());
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to initialize Redis connection: {0}", e.getMessage());
            // If we had an exception, create a dummy pool (will be closed immediately)
            if (pool == null) {
                pool = new JedisPool();
                pool.close();
            }
        }
        
        // Always assign the pool, regardless of initialization success
        this.jedisPool = pool;
        
        // Register shutdown hook to close Redis connections
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            LOGGER.info("Shutting down Redis connections...");
            unsubscribe();
            if (jedisPool != null && !jedisPool.isClosed()) {
                jedisPool.close();
                LOGGER.info("Redis connection pool closed");
            }
        }));
    }
    
    private String getEnvWithDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
    
    /**
     * Publish a message to the Redis chat channel
     */
    public void publish(String message) {
        if (!isConnected || jedisPool == null || jedisPool.isClosed()) {
            LOGGER.info("Redis not connected, skipping publish");
            return;
        }
        
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.publish(CHAT_CHANNEL, message);
            LOGGER.log(Level.FINE, "Published message to Redis channel: {0}", message);
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Failed to publish message to Redis: {0}", e.getMessage());
        }
    }
    
    /**
     * Subscribe to the Redis chat channel and process messages with the provided callback
     */
    public void subscribe(Consumer<String> messageHandler) {
        if (!isConnected || jedisPool == null || jedisPool.isClosed()) {
            LOGGER.info("Redis not connected, skipping subscribe");
            return;
        }
        
        // Unsubscribe first if already subscribed
        unsubscribe();
        
        LOGGER.info("Subscribing to Redis chat channel");
        jedisPubSub = new JedisPubSub() {
            @Override
            public void onMessage(String channel, String message) {
                LOGGER.log(Level.FINE, "Received message from Redis channel {0}: {1}", 
                          new Object[]{channel, message});
                messageHandler.accept(message);
            }
            
            @Override
            public void onSubscribe(String channel, int subscribedChannels) {
                LOGGER.log(Level.INFO, "Subscribed to Redis channel: {0}", channel);
            }
            
            @Override
            public void onUnsubscribe(String channel, int subscribedChannels) {
                LOGGER.log(Level.INFO, "Unsubscribed from Redis channel: {0}", channel);
            }
        };
        
        // Start subscriber in a separate thread
        subscriberThread = new Thread(() -> {
            try {
                if (jedisPool != null && !jedisPool.isClosed()) {
                    try (Jedis jedis = jedisPool.getResource()) {
                        LOGGER.info("Redis subscriber thread started");
                        jedis.subscribe(jedisPubSub, CHAT_CHANNEL);
                    }
                }
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, "Redis subscription error: {0}", e.getMessage());
            }
            LOGGER.info("Redis subscriber thread ended");
        });
        
        subscriberThread.setDaemon(true);
        subscriberThread.start();
    }
    
    /**
     * Unsubscribe from the Redis chat channel
     */
    public void unsubscribe() {
        if (jedisPubSub != null && jedisPubSub.isSubscribed()) {
            try {
                LOGGER.info("Unsubscribing from Redis chat channel");
                jedisPubSub.unsubscribe();
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Error unsubscribing from Redis: {0}", e.getMessage());
            }
        }
        
        if (subscriberThread != null && subscriberThread.isAlive()) {
            try {
                subscriberThread.join(1000); // Wait up to 1 second for the thread to end
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        jedisPubSub = null;
        subscriberThread = null;
    }
    
    /**
     * Check if Redis is connected
     */
    public boolean isConnected() {
        return isConnected && jedisPool != null && !jedisPool.isClosed();
    }
}