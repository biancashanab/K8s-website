FROM maven:3.8-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

FROM tomcat:9.0-jdk17
WORKDIR /usr/local/tomcat

# Modifică serverul Tomcat pentru a folosi portul 8080 intern
RUN sed -i 's/port="8080"/port="8080"/g' conf/server.xml

# Add MySQL JDBC driver
RUN curl -L https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.28/mysql-connector-java-8.0.28.jar -o ${CATALINA_HOME}/lib/mysql-connector-java.jar

COPY --from=build /app/target/chat.war webapps/ROOT.war

# Portul expus este 8080, dar va fi mapat la 88 în docker-compose
EXPOSE 8080
CMD ["catalina.sh", "run"]