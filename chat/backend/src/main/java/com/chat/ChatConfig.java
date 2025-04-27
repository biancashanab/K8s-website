package com.chat;

import javax.websocket.Endpoint;
import javax.websocket.server.ServerApplicationConfig;
import javax.websocket.server.ServerEndpointConfig;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.logging.Logger;

public class ChatConfig implements ServerApplicationConfig {
    private static final Logger LOGGER = Logger.getLogger(ChatConfig.class.getName());

    @Override
    public Set<ServerEndpointConfig> getEndpointConfigs(Set<Class<? extends Endpoint>> endpointClasses) {
        LOGGER.info("Programmatic WebSocket endpoints scanned: " + endpointClasses);
        return Collections.emptySet();
    }

    @Override
    public Set<Class<?>> getAnnotatedEndpointClasses(Set<Class<?>> scanned) {
        LOGGER.info("Scanned classes: " + scanned);
        Set<Class<?>> endpoints = new HashSet<>();
        endpoints.add(ChatEndpoint.class);
        LOGGER.info("Registering WebSocket endpoint: ChatEndpoint at /chat");
        return endpoints;
    }
}
