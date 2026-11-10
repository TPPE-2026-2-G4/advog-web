FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MINIO_INTERNAL
ARG NEXT_PUBLIC_MINIO_EXTERNAL
ARG NEXT_PUBLIC_MINIO_ALIAS
ARG NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MINIO_INTERNAL=$NEXT_PUBLIC_MINIO_INTERNAL
ENV NEXT_PUBLIC_MINIO_EXTERNAL=$NEXT_PUBLIC_MINIO_EXTERNAL
ENV NEXT_PUBLIC_MINIO_ALIAS=$NEXT_PUBLIC_MINIO_ALIAS
ENV NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL=$NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]