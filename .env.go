APP_ENV=production
PORT=8080

DATABASE_URL=postgres://ptms_user:ptms_password@ptms-postgres:5432/ptms_db?sslmode=disable

REDIS_URL=ptms-redis:6379
RABBITMQ_URL=amqp://guest:guest@ptms-rabbitmq:5672/

JWT_SECRET=your_super_secret_jwt_key
ROUTEX_ENVIRONMENT=sandbox
