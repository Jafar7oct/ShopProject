FROM node:22
WORKDIR /app
# Install build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*
# Copy only package.json
COPY package.json ./
# Install dependencies, forcing sqlite3 rebuild
RUN npm install --build-from-source
# Copy app files
COPY . .
EXPOSE 3000
CMD ["npm", "start"]