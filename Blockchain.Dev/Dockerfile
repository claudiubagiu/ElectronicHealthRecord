FROM node:20-alpine

WORKDIR /app

# Copiază package files
COPY package*.json ./

# Instalează dependențele
RUN npm install

# Copiază restul aplicației
COPY . .

# Compilează contractele
RUN npx hardhat compile

# Copiază și setează permisiuni pentru entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]