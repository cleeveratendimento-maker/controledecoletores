# 1. Usamos Node 20 (Versão moderna e rápida)
FROM node:20-alpine

# Define a pasta de trabalho
WORKDIR /app

# 2. Copia os arquivos de dependência primeiro (para o cache do Docker funcionar)
COPY package*.json ./

# 3. Instala as dependências do projeto
RUN npm install

# 4. Copia o resto do código fonte
COPY . .

# 5. Constrói o site (Gera a pasta 'dist')
RUN npm run build

# 6. Instala o servidor web leve
RUN npm install -g serve

# 7. Coloca no ar a pasta 'dist' na porta 3000
# O "-s" é vital para projetos Lovable/React (evita erro 404 ao atualizar a página)
CMD ["serve", "-s", "dist", "-l", "3000"]
