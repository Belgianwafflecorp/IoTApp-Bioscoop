CREATE USER 'webuser'@'%' IDENTIFIED BY 'webuserPass';
GRANT ALL PRIVILEGES ON cinema.* TO 'webuser'@'%';
FLUSH PRIVILEGES;