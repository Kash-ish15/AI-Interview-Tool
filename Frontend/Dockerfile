FROM node:20

WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]