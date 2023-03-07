# Use the latest LTS version of Node.js as the base image
FROM node:lts-slim as builder

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY . .

# Install the application dependencies
RUN npm install && npm run build

FROM node:lts-slim

# Copy the application source code to the container
WORKDIR /app

COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY ./tests ./tests

RUN npm link --only=production

# Set the command to run the application when the container starts
ENTRYPOINT [ "datagen" ]
