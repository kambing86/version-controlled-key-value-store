FROM node:10-alpine
WORKDIR /app
RUN npm install yarn@1.9.2 -g && chown -R node /app
USER node
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile
COPY . .
RUN yarn build && rm -rf node_modules
WORKDIR /app/lib
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile --prod && yarn cache clean
EXPOSE 8080
CMD ["node", "index.js"]
