
ChatGusto 🚀

ChatGusto é um assistente inteligente que roda dentro do Google AI Studio. Ele pode funcionar offline, online, e está integrado com um botão para exportar arquivos diretamente para o GitHub.

Funcionalidades principais

Assistente de código integrado ao GitHub 🐙

Transporte completo de pastas e arquivos do projeto

Pode rodar localmente ou na nuvem do AI Studio

Compatível com Node.js e .env para chaves de API

Pré-requisitos

Node.js
 instalado

Chave da API Gemini configurada em .env.local

Instalação
git clone <URL_DO_REPOSITORIO>
cd nome-do-projeto
npm install

Configuração da API

No arquivo .env.local:

GEMINI_API_KEY=<SUA_CHAVE_GEMINI>

Executando localmente
npm run dev


Abra o navegador em http://localhost:3000 (ou a porta mostrada no terminal) para usar o ChatGusto.

Contribuição

Se você quiser ajudar no desenvolvimento:

Crie uma branch para a sua feature (git checkout -b feature/nome-da-feature)

Faça commits das suas alterações (git commit -m 'Descrição da mudança')

Envie para o repositório (git push origin feature/nome-da-feature)

Abra um Pull Request 🚀
