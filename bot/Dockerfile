FROM python:3.11-alpine

WORKDIR /app

RUN pip install --no-cache-dir psycopg2-binary==2.9.9 requests==2.32.3

COPY bot.py .

CMD ["python", "bot.py"]
