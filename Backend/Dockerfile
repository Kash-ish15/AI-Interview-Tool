FROM node:18

WORKDIR /app

# Copy only package files first (for caching)
COPY package*.json ./

RUN npm install

# Copy rest of the code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]