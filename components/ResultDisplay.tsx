import React, { useState, useRef, useEffect, SetStateAction } from 'react';
import { CopyIcon, CheckIcon, DownloadIcon, MicrophoneIcon, StopIcon } from './icons';

interface ResultDisplayProps {
  text: string;
  onTextChange: (value: SetStateAction<string>) => void;
}

// Extend the global Window interface for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const languages = {
  'ta-IN': 'Tamil (India)',
  'en-US': 'English (US)',
  'hi-IN': 'Hindi (India)',
  'te-IN': 'Telugu (India)',
  'kn-IN': 'Kannada (India)',
  'ml-IN': 'Malayalam (India)',
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, onTextChange }) => {
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ta-IN');
  const recognitionRef = useRef<any | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const nextCursorPosRef = useRef<number | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sale-deed-draft.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support the Web Speech API. Try Chrome or Edge.");
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    
    recognition.lang = selectedLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript.trim() + ' ';
        }
      }
      
      if (fullTranscript && textAreaRef.current) {
        const { selectionStart, selectionEnd } = textAreaRef.current;
        
        // Use a functional update to avoid issues with stale state in the closure.
        // This ensures we are always modifying the most recent version of the text,
        // preventing dictation from overwriting previous parts of the same utterance.
        onTextChange((prevText: string) => {
            const newText = 
                prevText.substring(0, selectionStart) + 
                fullTranscript + 
                prevText.substring(selectionEnd);
            return newText;
        });
        
        // Schedule the cursor to be moved to the end of the newly inserted text.
        nextCursorPosRef.current = selectionStart + fullTranscript.length;
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onstart = () => {
        setIsRecording(true);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    
    recognition.start();
  };
  
  // Cleanup effect to stop recognition on unmount
  useEffect(() => {
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, []);
  
  // Effect to set cursor position after a dictation update
  useEffect(() => {
    if (textAreaRef.current && nextCursorPosRef.current !== null) {
      textAreaRef.current.focus();
      textAreaRef.current.setSelectionRange(nextCursorPosRef.current, nextCursorPosRef.current);
      nextCursorPosRef.current = null;
    }
  }, [text]);


  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80">
      <div className="flex justify-between items-center p-3 bg-slate-50/70 rounded-t-2xl border-b border-slate-200/80 flex-wrap gap-2">
        <div>
           <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                disabled={isRecording}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-200 disabled:cursor-not-allowed"
            >
                {Object.entries(languages).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                ))}
            </select>
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-3 py-1.5 ml-2 text-sm font-medium text-white border rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isRecording
                  ? 'bg-red-600 border-red-700 hover:bg-red-700 animate-pulse focus:ring-red-400'
                  : 'bg-green-600 border-green-700 hover:bg-green-700 focus:ring-green-400'
              }`}
            >
              {isRecording ? (
                <>
                  <StopIcon className="h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <MicrophoneIcon className="h-4 w-4" />
                  Dictate
                </>
              )}
            </button>
        </div>
        <div className="flex items-center">
             <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
             <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 ml-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <DownloadIcon className="h-4 w-4" />
              Download
            </button>
        </div>
      </div>
      <div className="p-6">
        <textarea
            ref={textAreaRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="w-full h-[60vh] font-sans text-base text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Your generated document will appear here. You can edit it directly or use the dictate feature."
        />
      </div>
    </div>
  );
};