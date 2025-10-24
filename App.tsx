
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, FunctionCall, Part, GenerateContentParameters, GenerateContentResponse, Tool } from '@google/genai';
import { Message, MessageRole, ChatMode } from './types';
import ChatMessage from './components/ChatMessage';
import { KidVentureLogo, SendIcon, LoadingSpinner, BrainIcon, ChatBubbleIcon, PhotoIcon, SearchIcon, CodeIcon, GitHubIcon } from './components/Icons';
import { generateImage, generateSpeech } from './services/geminiService';

const BASE_SYSTEM_INSTRUCTION = "Você é o ChatGusto, um assistente virtual criado pela KidVenture. A KidVenture não é só para crianças, é para todos. Sempre adicione emojis em suas respostas.";
const SYSTEM_INSTRUCTION_NORMAL = `${BASE_SYSTEM_INSTRUCTION} Você pode conversar e gerar trechos de código. Para criar uma imagem ou pesquisar na web, por favor, mude para o modo apropriado.`;
const SYSTEM_INSTRUCTION_IMAGE = `${BASE_SYSTEM_INSTRUCTION} Sua tarefa é criar imagens fantásticas! Use a ferramenta disponível para gerar uma imagem com base no que o usuário pedir.`;
const SYSTEM_INSTRUCTION_SEARCH = `${BASE_SYSTEM_INSTRUCTION} Sua tarefa é encontrar as informações mais atualizadas na web. Use a ferramenta de busca para responder às perguntas do usuário e sempre cite suas fontes. 🕵️‍♂️`;
const SYSTEM_INSTRUCTION_DEVELOPER = `${BASE_SYSTEM_INSTRUCTION} Você é um assistente especialista em programação. Ajude com código, explique conceitos complexos e resolva problemas de desenvolvimento. 💻`;
const SYSTEM_INSTRUCTION_GITHUB = `${BASE_SYSTEM_INSTRUCTION} Você é um especialista em analisar repositórios do GitHub. Sua tarefa é extrair informações chave. Use a ferramenta 'list_repo_files' para ver a estrutura do repositório. Em seguida, procure por arquivos como README.md, package.json, e LICENSE. Use 'get_file_content' para ler estes arquivos e extrair as seguintes informações: o nome do projeto, a descrição, o criador, a licença, e as dependências ou alguns trechos de código como exemplo. Apresente um resumo com estes pontos. 🐙`;

const CREATE_IMAGE_TOOL: FunctionDeclaration = {
  name: 'create_image',
  description: 'Cria uma imagem de alta qualidade com base em uma descrição de texto fornecida pelo usuário. Use-o sempre que o usuário pedir para criar, gerar ou desenhar uma imagem.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'Uma descrição detalhada da imagem a ser gerada.',
      },
    },
    required: ['prompt'],
  },
};

const LIST_REPO_FILES_TOOL: FunctionDeclaration = {
    name: 'list_repo_files',
    description: 'Lista os arquivos e diretórios em um caminho específico de um repositório do GitHub. Use isso para explorar a estrutura do repositório.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            repoUrl: {
                type: Type.STRING,
                description: 'A URL completa do repositório do GitHub (ex: "https://github.com/owner/repo").',
            },
            path: {
                type: Type.STRING,
                description: 'O caminho para o diretório a ser listado. O padrão é o diretório raiz se não for fornecido.',
            },
        },
        required: ['repoUrl'],
    },
};

const GET_FILE_CONTENT_TOOL: FunctionDeclaration = {
    name: 'get_file_content',
    description: 'Lê e retorna o conteúdo de um arquivo específico de um repositório do GitHub. Use isso depois de encontrar um arquivo com "list_repo_files".',
    parameters: {
        type: Type.OBJECT,
        properties: {
            repoUrl: {
                type: Type.STRING,
                description: 'A URL completa do repositório do GitHub (ex: "https://github.com/owner/repo").',
            },
            filePath: {
                type: Type.STRING,
                description: 'O caminho completo para o arquivo dentro do repositório (ex: "README.md" ou "src/index.js").',
            },
        },
        required: ['repoUrl', 'filePath'],
    },
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(ChatMode.NORMAL);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Effect for initializing and cleaning up AudioContext
  useEffect(() => {
    // Fix: Remove `as any` cast since a global type for webkitAudioContext is defined in types.ts.
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
        audioContextRef.current?.close();
    }
  }, []);

  // Effect for initializing chat based on the current mode
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let systemInstruction: string;
    let tools: Tool[] = [];
    let initialMessage: Message;

    switch (chatMode) {
        case ChatMode.IMAGE:
            systemInstruction = SYSTEM_INSTRUCTION_IMAGE;
            tools.push({ functionDeclarations: [CREATE_IMAGE_TOOL] });
            initialMessage = {
                id: 'init-image',
                role: MessageRole.MODEL,
                content: "Estou pronto para criar! 🖼️ O que você quer que eu desenhe?",
            };
            break;
        case ChatMode.SEARCH:
            systemInstruction = SYSTEM_INSTRUCTION_SEARCH;
            tools.push({ googleSearch: {} });
            initialMessage = {
                id: 'init-search',
                role: MessageRole.MODEL,
                content: "Hora de pesquisar! 🕵️ O que você gostaria de saber? Posso buscar as informações mais recentes para você.",
            };
            break;
        case ChatMode.GITHUB:
            systemInstruction = SYSTEM_INSTRUCTION_GITHUB;
            tools.push({ functionDeclarations: [LIST_REPO_FILES_TOOL, GET_FILE_CONTENT_TOOL] });
            initialMessage = {
                id: 'init-github',
                role: MessageRole.MODEL,
                content: "Olá! Forneça um link de um repositório do GitHub e eu farei o meu melhor para analisá-lo para você. 🐙",
            };
            break;
        case ChatMode.DEVELOPER:
            systemInstruction = SYSTEM_INSTRUCTION_DEVELOPER;
            initialMessage = {
                id: 'init-dev',
                role: MessageRole.MODEL,
                content: "Olá, dev! 💻 Estou pronto para te ajudar com códigos, algoritmos e o que mais precisar.",
            };
            break;
        case ChatMode.NORMAL:
        default:
            systemInstruction = SYSTEM_INSTRUCTION_NORMAL;
            initialMessage = {
                id: 'init-normal',
                role: MessageRole.MODEL,
                content: "Olá! Eu sou o ChatGusto. Posso conversar ou ajudar com código. O que vamos fazer hoje? 😊",
            };
            break;
    }

    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    setMessages([initialMessage]);
    
  }, [chatMode]); 

  const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
      const broaderMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (broaderMatch && broaderMatch[1] && broaderMatch[2]) {
          return { owner: broaderMatch[1], repo: broaderMatch[2] };
      }
      return null;
  };
  
  const handleFunctionCall = async (call: FunctionCall): Promise<Record<string, any>> => {
    const { name, args } = call;

    if (name === 'create_image') {
        const prompt = args.prompt as string;
        const loadingId = `image-${Date.now()}`;
        setMessages(prev => [...prev, { id: loadingId, role: MessageRole.MODEL, content: `🎨 Gerando imagem para: "${prompt}"`, isLoading: true }]);
        try {
            const imageData = await generateImage(prompt);
            setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, content: '', image: imageData, isLoading: false } : msg));
            return { success: true };
        } catch (error) {
            setMessages(prev => prev.map(msg => msg.id === loadingId ? { ...msg, content: `Desculpe, não consegui criar essa imagem. Por favor, tente novamente.`, isLoading: false } : msg));
            return { success: false, error: (error as Error).message };
        }
    }

    if (name === 'list_repo_files' || name === 'get_file_content') {
        const repoUrl = args.repoUrl as string;
        const parsed = parseRepoUrl(repoUrl);

        if (!parsed) {
            return { success: false, error: 'URL do repositório GitHub inválida.' };
        }
        const { owner, repo } = parsed;

        try {
            if (name === 'list_repo_files') {
                const path = (args.path as string) || '';
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.startsWith('/') ? path.substring(1) : path}`);
                if (!response.ok) {
                     const errorData = await response.json();
                     throw new Error(`Falha na API do GitHub: ${errorData.message || response.statusText}`);
                }
                const data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error("A resposta da API do GitHub não foi uma lista de arquivos. O caminho pode ser um arquivo único em vez de um diretório.");
                }
                const content = {
                    files: data.filter((item: any) => item.type === 'file').map((item: any) => item.path),
                    directories: data.filter((item: any) => item.type === 'dir').map((item: any) => item.path),
                };
                return { success: true, content };
            }

            if (name === 'get_file_content') {
                const filePath = args.filePath as string;
                const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
                 if (!repoInfoResponse.ok) {
                     const errorData = await repoInfoResponse.json();
                     throw new Error(`Falha ao buscar informações do repositório: ${errorData.message || repoInfoResponse.statusText}`);
                }
                const repoInfo = await repoInfoResponse.json();
                const defaultBranch = repoInfo.default_branch;
                
                if (!defaultBranch) {
                    throw new Error("Não foi possível determinar a branch padrão do repositório. Pode estar vazio.");
                }

                const fileResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath.startsWith('/') ? filePath.substring(1) : filePath}`);
                if (!fileResponse.ok) {
                    throw new Error(`Falha ao buscar o conteúdo do arquivo: ${fileResponse.statusText}`);
                }
                const content = await fileResponse.text();
                
                const MAX_LENGTH = 8000;
                const truncatedContent = content.length > MAX_LENGTH ? content.substring(0, MAX_LENGTH) + "\n\n... (conteúdo truncado)" : content;
                return { success: true, content: truncatedContent };
            }
        } catch (error) {
             return { success: false, error: (error as Error).message };
        }
    }

    return { success: false, error: 'Função desconhecida' };
  };

  const processResponse = (response: GenerateContentResponse) => {
      const text = response.text;
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      if (text) {
          const newModelMessage: Message = { 
              id: `model-${Date.now()}-${Math.random()}`, 
              role: MessageRole.MODEL, 
              content: text,
              groundingChunks: groundingMetadata?.groundingChunks || [],
          };
          setMessages(prev => [...prev, newModelMessage]);
      }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const currentUserInput = userInput.trim();
    const newUserMessage: Message = { id: `user-${Date.now()}`, role: MessageRole.USER, content: currentUserInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const chat = chatRef.current;
      if (!chat) throw new Error("Chat is not initialized.");
      
      const params: GenerateContentParameters = {
          message: currentUserInput,
      };

      if (isThinkingEnabled) {
          params.config = {
              thinkingConfig: { thinkingBudget: 8192 },
          };
      }

      const result = await chat.sendMessage(params);
      processResponse(result);

      const functionCalls = result.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        
        const toolResponses: Part[] = [];

        for (const call of functionCalls) {
            const { success, ...responsePayload } = await handleFunctionCall(call);
            toolResponses.push({
                functionResponse: {
                    name: call.name,
                    response: { success, ...responsePayload },
                },
            });
        }
        
        const finalParams: GenerateContentParameters = { message: toolResponses };
        if (isThinkingEnabled) {
            finalParams.config = { thinkingConfig: { thinkingBudget: 8192 } };
        }
        const finalResult = await chat.sendMessage(finalParams);
        processResponse(finalResult);
      }
    } catch (error) {
      console.error(error);
      const errorMessage: Message = { id: `error-${Date.now()}`, role: MessageRole.MODEL, content: "Oops! Algo deu errado. Por favor, tente novamente." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (id: string, text: string) => {
    if (currentlyPlayingId || !audioContextRef.current) return;
    setCurrentlyPlayingId(id);
    try {
        if(audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        const audioBuffer = await generateSpeech(text, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        source.onended = () => setCurrentlyPlayingId(null);
    } catch (error) {
        console.error("Speech generation/playback failed:", error);
        setCurrentlyPlayingId(null);
    }
  };

  // Fix: Changed icon type from JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  const ModeButton = ({ mode, label, icon }: { mode: ChatMode; label: string; icon: React.ReactNode; }) => (
    <button
        onClick={() => setChatMode(mode)}
        className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            chatMode === mode ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="p-4 border-b border-gray-700 flex items-center space-x-3">
        <KidVentureLogo />
        <div>
            <h1 className="text-xl font-bold">ChatGusto</h1>
            <p className="text-sm text-gray-400">by KidVenture</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onSpeak={handleSpeak} currentlyPlayingId={currentlyPlayingId} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Pergunte-me algo..."
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <LoadingSpinner /> : <SendIcon />}
          </button>
        </form>
         <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex items-center pl-1 space-x-2 text-sm text-gray-400">
              <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    id="thinking-toggle"
                    type="checkbox"
                    className="sr-only peer"
                    checked={isThinkingEnabled}
                    onChange={() => setIsThinkingEnabled(!isThinkingEnabled)}
                  />
                  <div className="w-10 h-6 rounded-full bg-gray-600 peer-checked:bg-purple-600"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
                </div>
                <span className="ml-2">Ativar Chain-of-Thought</span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
                <ModeButton mode={ChatMode.NORMAL} label="Normal" icon={<ChatBubbleIcon />} />
                <ModeButton mode={ChatMode.IMAGE} label="Imagem" icon={<PhotoIcon />} />
                <ModeButton mode={ChatMode.SEARCH} label="Pesquisa" icon={<SearchIcon />} />
                <ModeButton mode={ChatMode.GITHUB} label="GitHub" icon={<GitHubIcon />} />
                <ModeButton mode={ChatMode.DEVELOPER} label="Dev" icon={<CodeIcon />} />
            </div>
        </div>
      </footer>
    </div>
  );
}
