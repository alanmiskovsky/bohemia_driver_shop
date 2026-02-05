# Bohemia Driver Shop

WordPress e-commerce site running on Docker.

## Requirements

- Docker
- Docker Compose

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bohemia_driver_shop.git
   cd bohemia_driver_shop
   ```

2. Start the containers:
   ```bash
   docker-compose up -d
   ```

3. Access the services:
   - **WordPress**: http://localhost:8080
   - **phpMyAdmin**: http://localhost:8081

## Default Credentials

### Database
- User: `wordpress`
- Password: `wordpress_password`
- Root Password: `root_password`

> **Note**: Change these credentials in `docker-compose.yml` for production use.

## Commands

```bash
# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build
```

## Directory Structure

```
bohemia_driver_shop/
├── docker-compose.yml
├── wp-content/          # WordPress themes, plugins, uploads
├── .env.example         # Environment variables template
└── README.md
```
