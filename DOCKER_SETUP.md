# Docker Setup for Filipino POS System

This guide will help you set up and run the Filipino POS System using Docker.

## Prerequisites

- Docker Desktop installed on your system
- Docker Compose (usually included with Docker Desktop)

## Quick Start

1. **Clone and navigate to the project directory:**
   ```bash
   cd filipino-pos-system
   ```

2. **Copy the environment file:**
   ```bash
   cp env.example .env
   ```

3. **Start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Application: http://localhost:3000
   - MySQL Database: localhost:3306

**Note:** You'll need to create your own database schema and initial data in `docker/mysql/init/01-init.sql` before the application will work properly.

## Services

The Docker setup includes the following services:

### 1. MySQL Database (`mysql`)
- **Image:** mysql:8.0
- **Port:** 3306
- **Database:** filipino_pos
- **Username:** pos_user
- **Password:** pos_password
- **Root Password:** rootpassword

### 2. Next.js Application (`app`)
- **Port:** 3000
- **Environment:** Production
- **Database Connection:** Automatically configured to connect to MySQL

### 3. Development Application (`app-dev`) - Optional
- **Port:** 3001
- **Environment:** Development with hot reloading
- **Volume Mounting:** Source code is mounted for live updates

## Environment Variables

Create a `.env` file based on `env.example`:

```env
DATABASE_URL=mysql://pos_user:pos_password@localhost:3306/filipino_pos
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

## Available Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start only production app and database
docker-compose up -d mysql app

# Start development environment
docker-compose up -d mysql app-dev
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

### View Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs app
docker-compose logs mysql
```

### Database Management
```bash
# Connect to MySQL database
docker-compose exec mysql mysql -u pos_user -p filipino_pos

# Backup database
docker-compose exec mysql mysqldump -u pos_user -p filipino_pos > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u pos_user -p filipino_pos < backup.sql
```

### Development Commands
```bash
# Rebuild containers
docker-compose build

# Rebuild and start
docker-compose up --build

# Execute commands in running container
docker-compose exec app npm run lint
docker-compose exec app-dev npm install
```

## Database Schema

The MySQL database will be initialized with your custom schema defined in `docker/mysql/init/01-init.sql`.

### Custom Schema Setup

1. **Design your database schema** according to your business requirements
2. **Edit the initialization script** at `docker/mysql/init/01-init.sql`
3. **Add your table creation statements** and any seed data
4. **Test your schema** before deploying to production

### Schema Template

The initialization script includes a template with examples to help you get started. You can:
- Define your own table structures
- Add your own initial data
- Include any stored procedures or functions you need
- Set up proper indexes and constraints

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :3306
   
   # Stop conflicting services or change ports in docker-compose.yml
   ```

2. **Database connection issues:**
   ```bash
   # Check if MySQL is running
   docker-compose ps
   
   # Check MySQL logs
   docker-compose logs mysql
   
   # Restart MySQL service
   docker-compose restart mysql
   ```

3. **Application not starting:**
   ```bash
   # Check application logs
   docker-compose logs app
   
   # Rebuild the application
   docker-compose build app
   docker-compose up -d app
   ```

4. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Reset Everything
```bash
# Stop all services and remove everything
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Change default passwords
   - Set proper database credentials
   - Configure production database URL

2. **Use production compose file:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Set up reverse proxy (nginx):**
   - Configure SSL certificates
   - Set up domain name
   - Configure load balancing if needed

## File Structure

```
filipino-pos-system/
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Files to ignore in Docker build
├── env.example             # Environment variables template
├── docker/
│   └── mysql/
│       └── init/
│           └── 01-init.sql # Database initialization script
└── DOCKER_SETUP.md         # This documentation
```

## Support

If you encounter any issues with the Docker setup, please check:
1. Docker Desktop is running
2. Ports 3000 and 3306 are available
3. Environment variables are correctly set
4. Database initialization completed successfully

For additional help, check the application logs and MySQL logs for specific error messages.
