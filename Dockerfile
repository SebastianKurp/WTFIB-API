FROM mhart/alpine-node:12
WORKDIR /app
COPY package.json .
COPY yarn.lock .
RUN yarn install --production

FROM mhart/alpine-node:slim-12
WORKDIR /app
COPY --from=0 /app .
COPY . .

EXPOSE 8000
CMD ["node", "server.js"]
