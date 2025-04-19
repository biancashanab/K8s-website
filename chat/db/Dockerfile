FROM mysql:8.0

ENV MYSQL_DATABASE=chat
ENV MYSQL_USER=chatuser
ENV MYSQL_PASSWORD=chatpassword
ENV MYSQL_ROOT_PASSWORD=rootpassword

COPY ./init/init.sql /docker-entrypoint-initdb.d/

EXPOSE 3306
