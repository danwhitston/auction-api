# Based on https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

FROM node:17

# Create directory for the code
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle the source code
COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
