# Use the latest LTS version of Node.js as the base image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the application source code to the container
COPY ./datagen.js ./
COPY ./src ./src
COPY ./tests ./tests

RUN npm link

# Set the command to run the application when the container starts
ENTRYPOINT [ "datagen" ]
