FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN mkdir -p public
RUN yarn test:e2e && yarn test
RUN yarn build

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["yarn", "start", "--hostname", "0.0.0.0", "--port", "3000"]
