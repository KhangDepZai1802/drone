# Sử dụng Node.js (nhẹ)
FROM node:18-alpine

WORKDIR /app

# Copy package.json và cài thư viện
COPY package.json .
RUN npm install

# Copy toàn bộ code vào
COPY . .

# Build React ra thư mục /dist
RUN npm run build

# Cài đặt gói 'serve' để chạy web static
RUN npm install -g serve

# Mở port 3000
EXPOSE 3000

# Lệnh chạy: serve thư mục 'dist' ở port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]