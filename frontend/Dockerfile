FROM nginx:alpine

# Xóa file mặc định
RUN rm -rf /usr/share/nginx/html/*

# Copy 3 file vào container
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY app.js /usr/share/nginx/html/app.js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]