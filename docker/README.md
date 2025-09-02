# Docker Setup

## Development
```bash
cd docker/dev
docker-compose up -d
```

## Production
```bash
export POSTGRES_PASSWORD=your_secure_password
export JWT_SECRET=your_jwt_secret

cd docker/prod
docker-compose up -d
```

## Commands
- **Start**: `docker-compose up -d`
- **Stop**: `docker-compose down`
- **Logs**: `docker-compose logs -f api`
- **Rebuild**: `docker-compose up -d --build`