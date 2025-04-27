package com.chat;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import java.util.logging.Logger;

public class ApplicationInitializer implements ServletContextListener {
    private static final Logger LOGGER = Logger.getLogger(ApplicationInitializer.class.getName());

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        LOGGER.info("ApplicationInitializer: Context initialized");
        // Add any initialization logic here (e.g., database checks)
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        LOGGER.info("ApplicationInitializer: Context destroyed");
    }
}
