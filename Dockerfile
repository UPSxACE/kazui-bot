# Stage 1: Build the TypeScript code
FROM node:lts-alpine as build

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Run the application
FROM node:lts-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy the compiled code and package files from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
RUN npm install --production

# Expose the application port (e.g., 3000)
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/bot.js"]