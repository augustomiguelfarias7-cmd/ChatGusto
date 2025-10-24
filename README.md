ChatGusto 🚀

ChatGusto é um assistente inteligente que roda dentro do Google AI Studio. Ele pode funcionar online, offline, e possui um botão que exporta arquivos completos para o GitHub.

Funcionalidades principais

Assistente de código integrado ao GitHub 🐙

Transporte completo de pastas e arquivos do projeto

Funciona localmente ou na nuvem do AI Studio 🌐

Suporte a Node.js e .env para chaves de API

Pré-requisitos

Node.js
 instalado

Chave da API Gemini configurada em .env.local

Instalação
# Clone o repositório
gh repo clone augustomiguelfarias7-cmd/ChatGusto.git
cd ChatGusto

# Instale as dependências
npm install

Configuração da API

No arquivo .env.local:

GEMINI_API_KEY=<SUA_CHAVE_GEMINI>

Executando localmente
npm run dev


Abra o navegador em http://localhost:3000
 (ou a porta mostrada no terminal) para usar o ChatGusto.

Contribuição

Se você quiser contribuir:

Crie uma branch para sua feature:

git checkout -b feature/nome-da-feature


Faça commits das alterações:

git commit -m "Descrição da mudança"


Envie para o repositório:

git push origin feature/nome-da-feature


Abra um Pull Request 🚀
