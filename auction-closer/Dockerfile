# Based on Kulatunga (2021) and OpenJS Foundation (n.d.)

FROM node:17

RUN apt-get update && apt-get install -y cron && which cron && \
    rm -rf /etc/cron.*/*

COPY crontab /etc/cron.d/closer_crontab
RUN crontab /etc/cron.d/closer_crontab

# Create directory for the code
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Copy across the source code
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN ["chmod", "+x", "/entrypoint.sh"]
ENTRYPOINT ["/entrypoint.sh"]

CMD ["cron","-f", "-l", "2"]
