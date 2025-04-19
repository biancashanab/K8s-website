package com.chat;

import javax.websocket.Endpoint;
import javax.websocket.server.ServerApplicationConfig;
import javax.websocket.server.ServerEndpointConfig;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

// Configurare pentru ChatEndpoint și port
public class ChatConfig implements ServerApplicationConfig {

    @Override
    public Set<ServerEndpointConfig> getEndpointConfigs(Set<Class<? extends Endpoint>> endpointClasses) {
        // Configurarea portului 88 pentru WebSocket este gestionată în server.xml al Tomcat
        return Collections.emptySet();
    }

    @Override
    public Set<Class<?>> getAnnotatedEndpointClasses(Set<Class<?>> scanned) {
        Set<Class<?>> endpoints = new HashSet<>();
        // Adaugare endpoint de ChatEndpoint
        endpoints.add(ChatEndpoint.class);
        return endpoints;
    }
}