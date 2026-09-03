# Konventsiya: frontend host (dev noutbuk)da quriladi ("npm run build"),
# bu Dockerfile faqat tayyor dist/ papkasini nginx bilan xizmat qiladi.
# API va xavfsizlik sarlavhalari uchun reverse-proxy loyihaning bir bosqich
# yuqorisida (../proxy-nginx.conf) alohida boshqariladi.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 80
