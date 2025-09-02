FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate && npm run build

RUN npm ci --only=production && npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"]