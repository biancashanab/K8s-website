FROM maven:3.8-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM tomcat:9.0-jdk17
WORKDIR /usr/local/tomcat

# Change Tomcat's default port from 8080 to 88
RUN sed -i 's/port="8080"/port="88"/g' conf/server.xml

# Ensure our app is deployed to the ROOT context
RUN rm -rf /usr/local/tomcat/webapps/*

# Add MySQL JDBC driver
RUN curl -L https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.28/mysql-connector-java-8.0.28.jar -o ${CATALINA_HOME}/lib/mysql-connector-java.jar

# Copy the war file from the build stage
COPY --from=build /app/target/chat.war webapps/ROOT.war

# Environment variables for database connection
ENV DB_URL=jdbc:mysql://chat-db:3306/chat
ENV DB_USER=chatuser
ENV DB_PASSWORD=chatpassword

# Expose port 88 (now matching Tomcat's configured port)
EXPOSE 88
CMD ["catalina.sh", "run"]