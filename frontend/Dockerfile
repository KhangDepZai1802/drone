# Sử dụng Nginx bản siêu nhẹ (Alpine)
FROM nginx:alpine

# 1. Xóa các file mặc định của Nginx để sạch sẽ
RUN rm -rf /usr/share/nginx/html/*

# 2. Copy file index.html duy nhất của bạn vào thư mục gốc
COPY index.html /usr/share/nginx/html/index.html

# 3. Mở cổng 80 (Cổng web mặc định)
EXPOSE 80

# 4. Chạy Nginx
CMD ["nginx", "-g", "daemon off;"]