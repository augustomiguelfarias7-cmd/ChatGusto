
import React from 'react';
import { Message, MessageRole } from '../types';
import { BotIcon, UserIcon, SpeakerIcon, LoadingSpinner } from './Icons';

interface ChatMessageProps {
  message: Message;
  onSpeak: (id: string, text: string) => void;
  currentlyPlayingId: string | null;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSpeak, currentlyPlayingId }) => {
  const isModel = message.role === MessageRole.MODEL;
  const isPlaying = currentlyPlayingId === message.id;

  const renderGrounding = () => {
    if (!message.groundingChunks || message.groundingChunks.length === 0) {
      return null;
    }

    const sources = message.groundingChunks
      .map(chunk => chunk.web)
      .filter(source => source && source.uri);

    if (sources.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Fontes:</h4>
        <ul className="list-disc list-inside space-y-1">
          {sources.map((source, index) => (
            <li key={index} className="text-xs">
              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline break-all">
                {source.title || source.uri}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-400">
          <LoadingSpinner className="h-5 w-5" />
          <span>{message.content}</span>
        </div>
      );
    }
    if (message.image) {
      return <img src={message.image} alt="Generated" className="mt-2 rounded-lg max-w-sm" />;
    }
    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <div className={`flex items-start gap-4 my-4 ${!isModel && 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isModel ? 'bg-purple-600' : 'bg-blue-600'}`}>
        {isModel ? <BotIcon /> : <UserIcon />}
      </div>
      <div className={`p-4 rounded-lg max-w-2xl ${isModel ? 'bg-gray-800 rounded-bl-none' : 'bg-blue-800 rounded-br-none'}`}>
        {renderContent()}
        {renderGrounding()}
        {isModel && message.content && !message.isLoading && (
          <button
            onClick={() => onSpeak(message.id, message.content)}
            disabled={!!currentlyPlayingId}
            className="mt-3 p-1 rounded-full text-gray-400 hover:bg-gray-700 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Play audio"
          >
            {isPlaying ? <LoadingSpinner className="h-5 w-5 text-purple-400" /> : <SpeakerIcon />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
